use failure::Error;
use hyper::server::conn::AddrStream;
use hyper::service::{make_service_fn, service_fn};
use hyper::{Body, Method, Request, Response, Server, StatusCode};
use log::{error, info};
use std::convert::Infallible;
use std::net::SocketAddr;

struct ServerParams {
    static_path: Option<String>,
}

impl Clone for ServerParams {
    fn clone(&self) -> Self {
        ServerParams {
            static_path: self.static_path.clone(),
        }
    }
}

pub async fn start_server(addr: &SocketAddr, static_path: &Option<&str>) {
    let params = ServerParams {
        static_path: static_path.map(|s| s.to_owned()),
    };

    let make_svc = make_service_fn(|socket: &AddrStream| {
        // service_fn converts our function into a `Service`
        let remote_addr = socket.remote_addr();
        let params = params.clone();

        let service = service_fn(move |req: Request<Body>| {
            let method = req.method().clone();
            let uri = req.uri().clone();
            let params = params.clone();
            async move {
                let response = serve_request(req, &params).await.unwrap_or_else(|err| {
                    error!("{:?}", err);
                    let mut response = Response::new(Body::from("Server Error"));
                    *response.status_mut() = StatusCode::INTERNAL_SERVER_ERROR;
                    response
                });

                info!(
                    "{} {} {} {}",
                    remote_addr,
                    method,
                    uri,
                    response.status().as_u16()
                );
                Ok::<_, Infallible>(response)
            }
        });

        async { Ok::<_, Infallible>(service) }
    });

    info!("listening at {}", addr);
    let server = Server::bind(&addr)
        .serve(make_svc)
        .with_graceful_shutdown(shutdown_signal(&params));

    if let Err(e) = server.await {
        error!("server error: {}", e);
    }
}

async fn serve_request(req: Request<Body>, params: &ServerParams) -> Result<Response<Body>, Error> {
    let mut response = Response::new(Body::empty());

    match (req.method(), req.uri().path()) {
        (&Method::GET, "/hello") => {
            *response.body_mut() = Body::from("Hello");
        }
        (_, "/ws") => {
            upgrade_websocket(req, &mut response).await?;
        }
        _ => {
            if let Some(ref static_path) = params.static_path {
                let static_ = hyper_staticfile::Static::new(static_path);
                let response = static_.serve(req).await?;
                return Ok(response);
            } else {
                *response.status_mut() = StatusCode::NOT_FOUND;
                *response.body_mut() = Body::from("Not Found");
            }
        }
    }
    Ok(response)
}

async fn upgrade_websocket(req: Request<Body>, response: &mut Response<Body>) -> Result<(), Error> {
    use hyper::http::header::*;
    use hyper::http::HeaderValue;

    let req_headers = req.headers();
    if !(req_headers.get(UPGRADE) == Some(&HeaderValue::from_static("websocket"))
        && req_headers.get(SEC_WEBSOCKET_VERSION) == Some(&HeaderValue::from_static("13"))
        && req_headers.contains_key(SEC_WEBSOCKET_KEY))
    {
        *response.status_mut() = StatusCode::BAD_REQUEST;
        return Ok(());
    }

    let sec_websocket_key = req.headers()["Sec-WebSocket-Key"].as_bytes();
    let mut m = sha1::Sha1::new();
    m.update(sec_websocket_key);
    m.update("258EAFA5-E914-47DA-95CA-C5AB0DC85B11".as_bytes());
    let sec_websocket_accept = base64::encode(m.digest().bytes());

    tokio::task::spawn(connect_websocket(req));

    *response.status_mut() = StatusCode::SWITCHING_PROTOCOLS;
    let headers = response.headers_mut();
    headers.insert(CONNECTION, HeaderValue::from_static("upgrade"));
    headers.insert(UPGRADE, HeaderValue::from_static("websocket"));
    headers.insert(
        SEC_WEBSOCKET_ACCEPT,
        HeaderValue::from_str(&sec_websocket_accept).unwrap(),
    );
    Ok(())
}

async fn connect_websocket(req: Request<Body>) {
    use futures::StreamExt;
    use tokio_tungstenite::WebSocketStream;

    let upgraded = req.into_body().on_upgrade().await.unwrap();
    let mut ws_stream = WebSocketStream::from_raw_socket(
        upgraded,
        tokio_tungstenite::tungstenite::protocol::Role::Server,
        None,
    )
    .await;

    info!("Next");
    while let Some(msg) = ws_stream.next().await {
        info!("Received: {:?}", msg);
    }
}

async fn shutdown_signal(_params: &ServerParams) {
    tokio::signal::ctrl_c()
        .await
        .expect("failed to install shutdown signal");
    info!("shutting down");
}
