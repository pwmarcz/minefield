use std::convert::Infallible;
use std::net::SocketAddr;

use failure::Error;
use futures::StreamExt;
use hyper::http::{header, HeaderValue};
use hyper::server::conn::AddrStream;
use hyper::service::{make_service_fn, service_fn};
use hyper::{Body, Method, Request, Response, Server, StatusCode};
use log::{error, info};
use tokio_tungstenite::WebSocketStream;

use crate::game_server::GameServer;

struct ServerParams {
    static_path: Option<String>,
    game_server: GameServer,
}

impl Clone for ServerParams {
    fn clone(&self) -> Self {
        ServerParams {
            static_path: self.static_path.clone(),
            game_server: self.game_server.clone(),
        }
    }
}

pub async fn start_server(addr: &SocketAddr, static_path: &Option<&str>) {
    let game_server = GameServer::new();
    game_server.start_beat();

    let params = ServerParams {
        static_path: static_path.map(|s| s.to_owned()),
        game_server,
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
        (&Method::GET, "/debug") => {
            let dump = params.game_server.debug_dump();
            response.headers_mut().insert(
                header::CONTENT_TYPE,
                HeaderValue::from_str("application/json").unwrap(),
            );
            *response.body_mut() = Body::from(dump);
        }
        (_, "/ws") => {
            upgrade_websocket(req, &mut response, params.game_server.clone()).await?;
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

async fn upgrade_websocket(
    req: Request<Body>,
    response: &mut Response<Body>,
    game_server: GameServer,
) -> Result<(), Error> {
    use hyper::http::header::*;

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

    tokio::task::spawn(connect_websocket(req, game_server));

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

async fn connect_websocket(req: Request<Body>, game_server: GameServer) {
    let upgraded = match req.into_body().on_upgrade().await {
        Ok(upgraded) => upgraded,
        Err(e) => {
            error!("error upgrading: {}", e);
            return;
        }
    };
    let ws_stream = WebSocketStream::from_raw_socket(
        upgraded,
        tokio_tungstenite::tungstenite::protocol::Role::Server,
        None,
    )
    .await;

    let (writer, reader) = ws_stream.split();
    game_server.connect(reader, writer);
}

async fn shutdown_signal(_params: &ServerParams) {
    tokio::signal::ctrl_c()
        .await
        .expect("failed to install shutdown signal");
    info!("shutting down");
}
