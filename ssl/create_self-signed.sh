#!/bin/bash

openssl genrsa -out privateKey.pem 4096
openssl req -new -key privateKey.pem -out csr.pem

openssl x509 -in csr.pem -out certificate.pem -req -signkey privateKey.pem -days 365

rm csr.pem
