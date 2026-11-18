# Reverse proxy manager

This is an application to manage sites inside a VPS. This allows to set a reverse proxy that handles a domain name / port from the network, and pass it to a local application on an specific port.

It must handle a administative user (preferable with a sqlite database) 

The application must have the following features:
- a secure login with username and password for admin user
- must be deployed on a docker container
- the application must allow to create a new site with external domain or ip port, and redirect traffic to an internal port of a containerized application
- if a domain name is created, a letsencrypt https certificate must be issued and installed
- if the internal site is unresponsive / not deployed, a static landing page must be rendered
- the application should have a way to create a new site and pull the repository from github, and allow to manually trigger the required docker command to start the application

As technical features, we can list the following
- the application can be created using docker, docker compose, node and javascript
- we can use sqlite as database by default, but can be open to use mysql or posgresql using ORM
- we can create admin users from console, or the web ui
- must use material design for frontend UI
- analize which is the best decision for the reverse proxy, to use nginx or traeffic
- the application must be easily deployed on a VPS 

