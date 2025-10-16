import { useState } from 'react'
import { Button, Section, Select } from '../components/UI'
import { api, ApiAnalysisResponse } from '../api/client'
import { fetchApi } from '../lib/fetchApi'
import ProCTA from '../components/ProCTA'
import { initTelegram } from '../lib/telegram'

const SIGNS = ['овен','телец','близнецы','рак','лев','дева','весы','скорпион','стрелец','козерог','водолей','рыбы']

export default function Zodiac() {
  const [sign, setSign] = useState(SIGNS[0])
  const [res, setRes] = useState<null | ApiAnalysisResponse>(null)
  const [err, setErr] = useState('')
  return (
    <Section>
  <h2>Астрологический анализ</h2>
      <div className="row">
        <Select value={sign} onChange={(e) => setSign(e.target.value)}>
          {SIGNS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
            <Button
          onClick={async () => {
            setErr('')
            try {
              const userId = initTelegram() || 'guest'
              const r = await fetchApi<ApiAnalysisResponse>('/api/zodiac', { sign, userId })
              setRes(r)
            } catch (e: any) {
              setErr(e?.message || 'Ошибка')
            }
          }}
        >
          Сгенерировать отчет
        </Button>
      </div>
      {err && <p className="error">{err}</p>}
    {res && <div className="card">{res.analysis}
      {res.brief && <ProCTA reason={res.briefReason} />}
    </div>}
    </Section>
  )
}
