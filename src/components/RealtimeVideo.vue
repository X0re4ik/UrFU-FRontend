<template>
  <div class="app">
    <header>
      <h1>Мгновенная обработка видео в реальном времени с помощью AI</h1>
    </header>

    <div class="content">
      <div class="video-section">
        <div class="title">Исходный видеопоток</div>
        <div class="video-container">
          <video ref="inputVideo" controls autoplay muted playsinline></video>
        </div>
        <div class="server-params" v-if="serverInfo">
          <h2>Параметры сервера</h2>
          <table>
            <tr v-for="(value, key) in formattedServerInfo" :key="key">
              <td>{{ key }}</td>
              <td>{{ value }}</td>
            </tr>
          </table>
        </div>
      </div>

      <div class="video-section">
        <div class="title">Обработанный видеопоток</div>
        <div class="video-container">
          <video ref="outputVideo" controls autoplay muted playsinline></video>
        </div>
        <div class="detection-log" v-if="detections.length > 0">
          <h2>История детекций</h2>
          <table>
            <thead>
              <tr>
                <th>Время</th>
                <th>Тип модели</th>
                <th>Уверенность</th>
                <th>BBox</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="det in detections" :key="det.id + det.timestamp">
                <td>{{ new Date(det.timestamp).toLocaleTimeString() }}</td>
                <td>{{ det.modelType }}</td>
                <td>{{ (det.modelConf * 100).toFixed(1) }}%</td>
                <td>[{{ det.bbox.join(', ') }}]</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import Hls from 'hls.js'
import axios from 'axios'
import type { ServerInfo } from '@/entities/ServerInfo'
import type { DetectionInfo } from '@/entities/DetectionInfo'

const inputVideo = ref<HTMLVideoElement | null>(null)
const outputVideo = ref<HTMLVideoElement | null>(null)
const serverInfo = ref<ServerInfo | null>(null)
const currentDetectionInfo = ref<DetectionInfo | null>(null)
const detections = ref<DetectionInfo[]>([])

let ws: WebSocket | null = null
let intervalId: number | null = null

function setupHLS(videoElement: HTMLVideoElement | null, src: string) {
  if (!videoElement) return

  if (Hls.isSupported()) {
    const hls = new Hls()
    hls.loadSource(src)
    hls.attachMedia(videoElement)
  } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
    videoElement.src = src
  }
}

const formattedServerInfo = computed(() => {
  if (!serverInfo.value) return {}
  return {
    'FPS': serverInfo.value.fps,
    'Задержка (мс)': serverInfo.value.latency,
    'GPU': serverInfo.value.gpu,
    'Модель классификации': serverInfo.value.classificationModel,
    'Модель детекции': serverInfo.value.detectionModel,
  }
})

async function setupServerInfo() {
  const response = await axios.get<ServerInfo>('https://app.drone-detection-demo.ru/api/v1/micro-helper/server-info')
  serverInfo.value = response.data
}

function setupWebSocket() {
  ws = new WebSocket('wss://app.drone-detection-demo.ru/api/v1/micro-helper/last-detection')

  ws.onopen = () => {
    console.log('WebSocket подключен')
    intervalId = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }))
      }
    }, 500)
  }

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data) as DetectionInfo
    currentDetectionInfo.value = data

    if (!detections.value.some((det) => det.id === data.id)) {
      currentDetectionInfo.value = data
      detections.value.unshift(data)

      // Удаляем лишние, если больше 50
      if (detections.value.length > 50) {
        detections.value.pop()
      }
    }
  }

  ws.onerror = (error) => {
    console.error('Ошибка WebSocket:', error)
  }

  ws.onclose = () => {
    console.log('WebSocket отключен')
    if (intervalId) clearInterval(intervalId)
  }
}

onMounted(() => {
  setupHLS(inputVideo.value, 'https://app.drone-detection-demo.ru/hls/input1.m3u8')
  setupHLS(outputVideo.value, 'https://app.drone-detection-demo.ru/hls/input2.m3u8')
  setupServerInfo()
  setupWebSocket()
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
  if (ws) ws.close()
})
</script>

<style scoped>
.app {
  margin: 0;
  background: linear-gradient(#999, #666);
  display: flex;
  flex-direction: column;
  font-family: sans-serif;
  color: white;
  min-height: 100dvh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

header {
  text-align: center;
  padding: 20px;
  background-color: #444;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.4);
}

header h1 {
  margin: 0;
  font-size: 24px;
}

.content {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  padding: 20px;
  gap: 20px;
  flex: 1;
}

.video-section {
  flex: 1 1 45%;
  max-width: 1500px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.title {
  font-size: 20px;
  margin-bottom: 10px;
  text-align: center;
}

.video-container {
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #222;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.4);
  margin-bottom: 15px;
}

video {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
}

.server-params {
  width: 100%;
  background-color: #333;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 0 10px rgba(0,0,0,0.3);
}

.server-params h2 {
  margin-top: 0;
  font-size: 18px;
  margin-bottom: 10px;
  text-align: center;
}

.server-params table {
  width: 100%;
  border-collapse: collapse;
}

.server-params th,
.server-params td {
  border: 1px solid #555;
  padding: 8px;
  text-align: left;
}

.server-params th {
  background-color: #444;
}

.detection-log {
  width: 100%;
  background-color: #2b2b2b;
  margin-top: 20px;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0,0,0,0.3);
}

.detection-log h2 {
  font-size: 18px;
  text-align: center;
  margin-bottom: 10px;
}

.detection-log table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.detection-log th,
.detection-log td {
  border: 1px solid #444;
  padding: 8px;
  text-align: left;
}

.detection-log th {
  background-color: #3b3b3b;
}

@media (max-width: 767px) {
  .video-section {
    flex: 1 1 100%;
    max-width: 100%;
  }

  header h1 {
    font-size: 20px;
    padding: 0 10px;
  }

  .title {
    font-size: 18px;
  }

  .content {
    padding: 10px;
    gap: 15px;
  }

  .server-params {
    padding: 10px;
  }

  .server-params h2,
  .detection-log h2 {
    font-size: 16px;
  }

  .server-params table,
  .server-params th,
  .server-params td,
  .detection-log table,
  .detection-log th,
  .detection-log td {
    font-size: 14px;
  }
}
</style>
