#!/bin/bash

echo "🧹 1. Eski Test Namespace'leri temizleniyor..."
kubectl delete namespace test-ai-extreme --ignore-not-found=true

echo "🚀 2. 'test-ai-extreme' Namespace'i oluşturuluyor..."
kubectl create namespace test-ai-extreme

echo "📦 3. Extreme Sorun 1: Read-Only Root FS Crash"
# Pod'un SecurityContext'i dosya sistemini salt-okunur (read-only) yapar.
# Nginx çalışırken /var/cache/nginx veya /var/run dizinlerine yazmaya çalışır.
# "Read-only file system" hatası vererek çöker. (Çok yaygın bir DevSecOps sorunudur)
cat <<INNER_EOF | kubectl apply -n test-ai-extreme -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: readonly-crash-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: readonly-crash
  template:
    metadata:
      labels:
        app: readonly-crash
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        securityContext:
          readOnlyRootFilesystem: true
INNER_EOF

echo "📦 4. Extreme Sorun 2: ConfigMap Directory Mount Mismatch"
# Kubernetes'te ConfigMap bir dosyaya mount edilirken 'subPath' KULLANILMAZSA,
# Kubernetes o hedefe ConfigMap'in içeriğini barındıran bir KLASÖR oluşturur.
# Nginx, /etc/nginx/nginx.conf adında bir dosya beklerken karşısında bir klasör bulur.
# Loglarda: open() "/etc/nginx/nginx.conf" failed (21: Is a directory) hatası ile çöker.
kubectl create configmap dummy-conf --from-literal=nginx.conf="server {}" -n test-ai-extreme
cat <<INNER_EOF | kubectl apply -n test-ai-extreme -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dir-clash-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: dir-clash
  template:
    metadata:
      labels:
        app: dir-clash
    spec:
      volumes:
      - name: conf-vol
        configMap:
          name: dummy-conf
      containers:
      - name: nginx
        image: nginx:alpine
        volumeMounts:
        - name: conf-vol
          mountPath: /etc/nginx/nginx.conf
          # HATA: subPath: nginx.conf parametresi eksik!
INNER_EOF

echo "📦 5. Extreme Sorun 3: DNS Policy Mismatch"
# Pod içerisinden kubernetes içi servislere ulaşmak için dnsPolicy 'ClusterFirst' olmalıdır.
# Burada bilerek 'Default' yapılmıştır. Default, uygulamanın çalıştığı Node'un (Host'un) DNS'ini kullanır,
# CoreDNS'e gitmediği için Kubernetes cluster içi servisleri ÇÖZEMEZ.
cat <<INNER_EOF | kubectl apply -n test-ai-extreme -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dns-fail-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: dns-fail
  template:
    metadata:
      labels:
        app: dns-fail
    spec:
      dnsPolicy: Default # HATA BURADA: ClusterFirst olmalı
      containers:
      - name: curl
        image: curlimages/curl
        command: ["curl", "-v", "https://kubernetes.default.svc"]
INNER_EOF

echo "📦 6. Extreme Sorun 4: ServiceAccount Unauthorized Error"
# Pod Kubernetes API'sine erişmeye (örneğin pod listesi çekmeye) çalışıyor.
# Ancak pod seviyesinde automountServiceAccountToken: false ayarlanmış.
# Pod gerekli token dosyasını bulamayacağı için bağlantıyı reddeder ve loglarda Unauthorized döner.
cat <<INNER_EOF | kubectl apply -n test-ai-extreme -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rbac-fail-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: rbac-fail
  template:
    metadata:
      labels:
        app: rbac-fail
    spec:
      automountServiceAccountToken: false
      containers:
      - name: kubectl
        image: bitnami/kubectl
        command: ["kubectl", "get", "pods"]
INNER_EOF

echo "✅ Extreme test ortamı hazırlandı! Bakalım BanriFlow'un zekası bu karmaşık edge-case sorunları anlayıp doğru 'kubectl patch' komutunu üretebilecek mi..."
