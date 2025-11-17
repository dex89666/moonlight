import { useState } from 'react'

const variants = [
  '/designs/concept-eye-02.svg',
  '/designs/concept-eye-02-anim.svg',
  '/designs/concept-eye-03.svg',
  '/designs/concept-eye-04.svg',
  '/designs/concept-eye.svg',
]

export default function DesignPreview() {
  const [idx, setIdx] = useState(0)
  return (
    <div style={{padding:24}}>
      <h2 style={{color:'#efe8ff'}}>Design preview — Cosmic Eye</h2>
      <div style={{display:'flex',gap:12,alignItems:'center',marginTop:12}}>
        <button onClick={() => setIdx((i) => (i - 1 + variants.length) % variants.length)}>◀</button>
        <div style={{width:920, height:520, background:'linear-gradient(180deg,#020214,#04102a)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',boxShadow:'0 6px 30px rgba(0,0,0,0.6)'}}>
          <img src={variants[idx]} alt={`variant-${idx}`} style={{maxWidth:'100%',maxHeight:'100%'}}/>
        </div>
        <button onClick={() => setIdx((i) => (i + 1) % variants.length)}>▶</button>
      </div>
      <div style={{marginTop:12,color:'#bdb6df'}}>
        Variant {idx + 1} of {variants.length} — <a href={variants[idx]} style={{color:'#ffdca3'}}>open raw</a>
      </div>
    </div>
  )
}
