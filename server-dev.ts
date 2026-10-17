import app from './api/index.ts'

const port = Number(process.env.API_PORT ?? 3001)
app.listen(port, () => console.log(`API listening on http://localhost:${port}`))
