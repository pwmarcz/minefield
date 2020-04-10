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
                let response = serve_request(req, &params).await?;
                info!(
                    "{} {} {} {}",
                    remote_addr,
                    method,
                    uri,
                    response.status().as_u16()
                );
                Ok::<_, Error>(response)
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
            Ok(response)
        }
        _ => {
            if let Some(ref static_path) = params.static_path {
                let static_ = hyper_staticfile::Static::new(static_path);
                let response = static_.serve(req).await?;
                Ok(response)
            } else {
                *response.status_mut() = StatusCode::NOT_FOUND;
                *response.body_mut() = Body::from("Not Found");
                Ok(response)
            }
        }
    }
}

async fn shutdown_signal(_params: &ServerParams) {
    tokio::signal::ctrl_c()
        .await
        .expect("failed to install shutdown signal");
    info!("shutting down");
}
