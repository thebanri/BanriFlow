#!/bin/bash

echo "🧹 1. Eski Gerçek Dünya Namespace'i temizleniyor..."
kubectl delete namespace test-realworld --ignore-not-found=true

echo "🚀 2. 'test-realworld' Namespace'i oluşturuluyor..."
kubectl create namespace test-realworld

echo "🏢 GERÇEK DÜNYA SENARYOSU 1: Yetersiz Bellek (OOMKilled) 💥"
# Gerçek hayatta geliştiriciler sık sık memory limitlerini çok düşük belirler.
# Nginx/Redis gibi uygulamalar başlarken çok az belleğe sıkışır ve Kubernetes tarafından
# acımasızca "OOMKilled" (Out Of Memory) diyerek öldürülür. 
# AI'ın Events (uyarılar) arasından OOMKilled'ı görüp limitleri yükseltmesi gerekecek.
cat <<INNER_EOF | kubectl apply -n test-realworld -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: oom-crash-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: oom-crash
  template:
    metadata:
      labels:
        app: oom-crash
    spec:
      containers:
      - name: app
        image: node:alpine
        command: ["node", "-e", "const a = new Array(10000000).fill('data'); console.log('Memory allocated, idling...'); setInterval(() => {}, 1000);"]
        resources:
          limits:
            memory: "15Mi" # Node.js 15MB ile çalışamaz, script anında OOM yer!
INNER_EOF

echo "🏢 GERÇEK DÜNYA SENARYOSU 2: Eksik Çevre Değişkeni (Missing Env Var) 🔑"
# Veritabanı uygulamaları (örn: MySQL, PostgreSQL) başlatılırken şifre gibi zorunlu
# çevre değişkenleri (environment variables) bekler. Eğer verilmezse uygulama başlatılmaz
# ve loglara hata basarak CrashLoopBackOff'a girer.
# AI'ın logları okuyup eksik değişkeni (MYSQL_ROOT_PASSWORD) fark etmesi ve eklemesi gerekecek.
cat <<INNER_EOF | kubectl apply -n test-realworld -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: db-crash-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: db-crash
  template:
    metadata:
      labels:
        app: db-crash
    spec:
      containers:
      - name: mysql
        image: mysql:5.7
        # HATA: MYSQL_ROOT_PASSWORD değişkeni bilerek eklenmedi!
INNER_EOF

echo "🏢 GERÇEK DÜNYA SENARYOSU 3: Yanlış Liveness Probe (Healthcheck Hatası) 🩺"
# Çok sık karşılaşılan bir DevOps hatasıdır. Uygulama aslında sapa sağlam çalışıyordur
# (Örn: Nginx 80 portundan hizmet veriyor), ancak sağlık kontrolü (Liveness Probe)
# yanlış bir porta (8080) yapılandırılmıştır.
# Kubernetes uygulamaya ulaşamadığını sanıp sağlam uygulamayı sürekli yeniden başlatır!
# AI'ın Nginx'in 80 portunda çalıştığını bilip Probe portunu düzeltmesi gerekecek.
cat <<INNER_EOF | kubectl apply -n test-realworld -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: probe-fail-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: probe-fail
  template:
    metadata:
      labels:
        app: probe-fail
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        ports:
        - containerPort: 80
        livenessProbe:
          httpGet:
            path: /
            port: 8080 # HATA: Nginx 80'de çalışır ama Probe 8080'i kontrol ediyor!
          initialDelaySeconds: 3
          periodSeconds: 3
INNER_EOF

echo "✅ Gerçek dünya prodüksiyon simülasyonu hazırlandı!"
echo "BanriFlow bu 3 senaryoyu (OOMKilled, Missing Env, Liveness Probe) başarıyla çözerse, gerçekten bir DevOps mühendisi olmuş demektir!"
