(async () => {
  try {
    const res = await fetch('http://localhost:3000/api/pro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'test-user-42' })
    })
    console.log('status', res.status)
    const text = await res.text()
    console.log('body', text)
  } catch (e) {
    console.error('error', e)
  }
})()
