interface DetectionInfo {
    id: string
    timestamp: string
    modelType: string
    modelConf: number
    bbox: [number, number, number, number]
}