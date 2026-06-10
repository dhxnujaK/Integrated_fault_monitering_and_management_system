export const predictionEndpoints = {
  list: null,
  create: null,
}

export async function getPredictions() {
  return []
}

export async function createPrediction() {
  throw new Error('Prediction create endpoint is not available in the backend.')
}
