extern crate env_logger;
extern crate failure;
extern crate hyper;
extern crate hyper_staticfile;
extern crate log;
extern crate tokio;

use failure::Error;
use hyper::server::conn::AddrStream;
use hyper::service::{make_service_fn, service_fn};
use hyper::{Body, Method, Request, Response, Server};
use log::{error, info};
use std::convert::Infallible;
use std::net::SocketAddr;

async fn hello_world(req: Request<Body>, static_path: &str) -> Result<Response<Body>, Error> {
    let mut response = Response::new(Body::empty());

    let static_ = hyper_staticfile::Static::new(static_path);

    match (req.method(), req.uri().path()) {
        (&Method::GET, "/hello") => {
            *response.body_mut() = Body::from("Hello");
            Ok(response)
        }
        _ => {
            let response = static_.serve(req).await?;
            Ok(response)
        }
    }
}

async fn shutdown_signal() {
    tokio::signal::ctrl_c()
        .await
        .expect("failed to install shutdown signal");
    info!("shutting down");
}

#[tokio::main]
async fn main() {
    env_logger::builder()
        .filter_level(log::LevelFilter::Info)
        .init();

    let addr = SocketAddr::from(([127, 0, 0, 1], 8000));
    let static_path = "/home/pawel/minefield/client/static/".to_owned();

    // A `Service` is needed for every connection, so this
    // creates one from our `hello_world` function.
    let make_svc = make_service_fn(|socket: &AddrStream| {
        // service_fn converts our function into a `Service`
        let remote_addr = socket.remote_addr();
        let static_path = static_path.clone();

        let service = service_fn(move |req: Request<Body>| {
            let method = req.method().clone();
            let uri = req.uri().clone();
            let static_path = static_path.clone();
            async move {
                let response = hello_world(req, &static_path).await?;
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

    let server = Server::bind(&addr)
        .serve(make_svc)
        .with_graceful_shutdown(shutdown_signal());

    if let Err(e) = server.await {
        error!("server error: {}", e);
    }
}
