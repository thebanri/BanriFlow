#!/bin/bash

echo "🧹 1. Eski Test Namespace'leri temizleniyor..."
kubectl delete namespace test-ai-ops-hard --ignore-not-found=true

echo "🚀 2. 'test-ai-ops-hard' Namespace'i oluşturuluyor..."
kubectl create namespace test-ai-ops-hard

echo "📦 3. Zorlu Sorun 1: CreateContainerConfigError (Eksik ConfigMap)"
# Pod başlayamayacak çünkü var olmayan bir ConfigMap'ten environment variable okumaya çalışıyor.
cat <<INNER_EOF | kubectl apply -n test-ai-ops-hard -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: missing-config-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: missing-config-app
  template:
    metadata:
      labels:
        app: missing-config-app
    spec:
      containers:
      - name: busybox
        image: busybox
        command: ["sleep", "3600"]
        envFrom:
        - configMapRef:
            name: ghost-configmap
INNER_EOF

echo "📦 4. Zorlu Sorun 2: Unhealthy (Hatalı Liveness Probe)"
# Pod çalışacak ancak liveness probe yanlış porta baktığı için sürekli Unhealthy hatası verip Kubelet tarafından öldürülecek.
cat <<INNER_EOF | kubectl apply -n test-ai-ops-hard -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: probe-fail-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: probe-fail-app
  template:
    metadata:
      labels:
        app: probe-fail-app
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        ports:
        - containerPort: 80
        livenessProbe:
          httpGet:
            path: /
            port: 8080 # Yanlış port (nginx 80'de çalışıyor)
          initialDelaySeconds: 3
          periodSeconds: 3
INNER_EOF

echo "📦 5. Zorlu Sorun 3: FailedScheduling (Eksik Node Label / NodeSelector)"
# Pod hiçbir node'a yerleşemeyecek (Pending) çünkü çok ütopik bir donanım arıyor.
cat <<INNER_EOF | kubectl apply -n test-ai-ops-hard -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: unschedulable-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: unschedulable-app
  template:
    metadata:
      labels:
        app: unschedulable-app
    spec:
      nodeSelector:
        hardware: quantum-computer
      containers:
      - name: busybox
        image: busybox
        command: ["sleep", "3600"]
INNER_EOF

echo "📦 6. Zorlu Sorun 4: OOMKilled (Aşırı Bellek Tüketimi / Memory Leak)"
# Pod memory limitini saniyeler içinde aşıp OOMKilled yiyecek.
# (Yapay zekanın bunu anlayabilmesi için logları veya eventleri iyi incelemesi gerekecek)
cat <<INNER_EOF | kubectl apply -n test-ai-ops-hard -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: oom-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: oom-app
  template:
    metadata:
      labels:
        app: oom-app
    spec:
      containers:
      - name: memory-hog
        image: busybox
        command: ["sh", "-c", "a=''; while true; do a=\$a'OOM_KILLED_TEST_STRING_XXXXXXXXXXXXXXXXXX'; done"]
        resources:
          limits:
            memory: "15Mi"
INNER_EOF

echo "✅ Zorlu test ortamı hazırlandı! Pod'ların hatalarını ve BanriFlow'un bunlara vereceği tepkileri bekleyin..."
