export async function searchImage(file, onProgress) {
  const form = new FormData()
  form.append('file', file)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/search')
    xhr.upload.onprogress = e => {
      if (e.lengthComputable && onProgress) onProgress(Math.round(e.loaded / e.total * 100))
    }
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText)
        if (xhr.status >= 400) reject(new Error(data.error || `Error ${xhr.status}`))
        else resolve(data)
      } catch { reject(new Error('Invalid server response')) }
    }
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.timeout = 60000
    xhr.ontimeout = () => reject(new Error('Request timed out'))
    xhr.send(form)
  })
}
