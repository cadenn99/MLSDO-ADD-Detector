# Step 1: Build the server.
# The server must be build  from source,
# since no pre-built binaries are available
FROM golang:1.25-alpine AS server
RUN go install github.com/minio/minio@latest

# Step 2: Install admin tools
FROM minio/mc AS client

# Step 3: Copy server and admin tools to a final image,
# optimised for size
FROM alpine:latest AS final

COPY --from=server /go/bin/minio /usr/bin/minio
COPY --from=client /usr/bin/mc /usr/bin/mc

CMD minio server /data --console-address ":9001" --address ":9000"