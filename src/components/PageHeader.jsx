export default function PageHeader({ title, subtitle, section }) {
  return (
    <>
      <p className="eyebrow">Rovers Südliches Dreieck · Cantina</p>
      <h1 className="page-title">{title}</h1>
      <p className="page-subtitle">{subtitle}</p>
    </>
  );
}

