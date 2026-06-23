#!/bin/bash

echo "🧹 1. Eski Test ve Etkileşimli Namespace'ler temizleniyor..."
kubectl delete namespace cloud-processor ticketing-dev test-ai-ops --ignore-not-found=true
kubectl delete all --all -n default

echo "🚀 2. 'test-ai-ops' Namespace'i oluşturuluyor..."
kubectl create namespace test-ai-ops

echo "📦 3. Çözülebilir Sorun 1: ImagePullBackOff (Kasıtlı Hatalı İmaj Harfi)"
# Kullanıcı AI'a "imaj adını nginx:latest olarak düzelt" diyerek çözdürebilir.
kubectl create deployment typo-app --image=nginxx:latest -n test-ai-ops

echo "📦 4. Çözülebilir Sorun 2: CrashLoopBackOff (Bozuk Komut Argümanı)"
# Pod sürekli çökecek çünkü sleep komutuna harf verdik. AI bunu analiz edip deployment'ı yamalayabilir.
cat <<INNER_EOF | kubectl apply -n test-ai-ops -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: crash-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: crash-app
  template:
    metadata:
      labels:
        app: crash-app
    spec:
      containers:
      - name: busybox
        image: busybox
        command: ["sleep", "on-saniye"]
INNER_EOF

echo "📦 5. Çözülebilir Sorun 3: CPU/Memory Limiti Fazla (Pending State)"
# Raspberry Pi'ın gücünü aşan devasa bir bellek isteği. Pod Pending kalacak. AI bunu düşürebilir.
cat <<INNER_EOF | kubectl apply -n test-ai-ops -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pending-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: pending-app
  template:
    metadata:
      labels:
        app: pending-app
    spec:
      containers:
      - name: memory-hog
        image: nginx
        resources:
          requests:
            memory: "64Gi"
INNER_EOF

echo "✅ Test ortamı hazırlandı! Pod'ların çökmesini ve KubeSight loglarına düşmesini bekleyin..."
