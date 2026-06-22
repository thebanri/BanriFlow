FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o banri main.go

FROM alpine:latest
WORKDIR /root/
# Install ca-certificates for Kubernetes/LLM API connections
RUN apk --no-cache add ca-certificates
COPY --from=builder /app/banri /usr/local/bin/banri
EXPOSE 3005

# Varsayılan olarak serve modunda çalıştır
ENTRYPOINT ["banri"]
CMD ["serve"]
