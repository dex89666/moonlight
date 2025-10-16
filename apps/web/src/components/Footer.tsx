export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <small>
          Развлекательный сервис. Без медицинских/финансовых/юридических рекомендаций.
        </small>
        <div style={{ float: 'right' }}>
          <a href="/LEGAL_OFFER.md" target="_blank" rel="noopener noreferrer" className="btn btn--float"><span className="icon" aria-hidden>📜</span> Публичная оферта</a>
        </div>
      </div>
    </footer>
  )
}
