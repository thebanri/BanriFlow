#!/bin/bash

echo "🔥 1. Eski Nightmare Namespace'i temizleniyor..."
kubectl delete namespace test-nightmare --ignore-not-found=true

echo "🚀 2. 'test-nightmare' Namespace'i oluşturuluyor..."
kubectl create namespace test-nightmare

echo "💀 NIGHTMARE SENARYOSU 1: Ölümsüz InitContainer (Init:CrashLoopBackOff)"
# Uygulamanın ana konteyneri kusursuzdur, ancak ön hazırlık yapan "initContainer"
# ulaşılamayan bir URL'den dosya indirmeye çalıştığı için sürekli çöker.
# Pod asla ayağa kalkamaz. AI'ın initContainer'ı fark edip komutunu düzeltmesi
# veya initContainer'ı tamamen silmesi gerekecek!
cat <<INNER_EOF | kubectl apply -n test-nightmare -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: init-crash-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: init-crash
  template:
    metadata:
      labels:
        app: init-crash
    spec:
      initContainers:
      - name: setup
        image: busybox
        command: ["sh", "-c", "wget -qO- http://this-url-does-not-exist.com/config.json || exit 1"]
      containers:
      - name: nginx
        image: nginx:alpine
INNER_EOF

echo "💀 NIGHTMARE SENARYOSU 2: Sessiz Katil (Sürekli Başarısız Readiness Probe)"
# Pod aslında 'Running' durumundadır ve çökmüyordur. Ancak Readiness Probe
# konteyner içindeki '/tmp/healthy' dosyasını arar. Bu dosya var olmadığı için
# pod hiçbir zaman 'Ready' (Hazır) olamaz ve trafiğe açılmaz.
# Kubernetes "Readiness probe failed: cat: can't open '/tmp/healthy'" uyarısı basar.
# AI'ın Nginx'i başlatmadan önce o dosyayı yaratması veya probe'u değiştirmesi gerekir.
cat <<INNER_EOF | kubectl apply -n test-nightmare -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: silent-killer-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: silent-killer
  template:
    metadata:
      labels:
        app: silent-killer
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        readinessProbe:
          exec:
            command:
            - cat
            - /tmp/healthy
          initialDelaySeconds: 2
          periodSeconds: 2
INNER_EOF

echo "💀 NIGHTMARE SENARYOSU 3: Yanlış Secret Anahtarı (CreateContainerConfigError)"
# Pod, bir Secret'ın içindeki şifreyi çevre değişkeni olarak almaya çalışır.
# Ancak Secret'ı tanımlayan yazılımcı anahtarın adını 'password' yapmışken,
# Deployment YAML'ı içinden 'db-password' anahtarı çağrılmaktadır!
# Bu yüzden Kubernetes konteyneri yaratmayı reddeder (CreateContainerConfigError).
kubectl create secret generic db-secret --from-literal=password="supersecret" -n test-nightmare
cat <<INNER_EOF | kubectl apply -n test-nightmare -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secret-mismatch-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: secret-mismatch
  template:
    metadata:
      labels:
        app: secret-mismatch
    spec:
      containers:
      - name: app
        image: busybox
        command: ["sleep", "3600"]
        env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: db-password # HATA: Gerçek anahtarın adı 'password' olmalıydı!
INNER_EOF

echo "✅ Nightmare (Kabus) ortamı hazırlandı!"
echo "BanriFlow bu senaryoları da tek seferde (veya 3 denemede) çözerse, gerçekten korkutucu derecede akıllı demektir!"
