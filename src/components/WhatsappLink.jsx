export function getWhatsappNumber(phone) {
  const value = String(phone || '').trim();
  const digits = value.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return '';
  return value.startsWith('+') || digits.length > 11 ? digits : `55${digits}`;
}

export function getWhatsappUrl(phone, message = '') {
  const number = getWhatsappNumber(phone);
  if (!number) return '';
  const messageParam = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${number}${messageParam}`;
}

export default function WhatsappLink({ phone, className = '' }) {
  if (!phone) return <>-</>;
  const href = getWhatsappUrl(phone);
  if (!href) return <span title="Número inválido para abrir no WhatsApp">{phone}</span>;

  return (
    <a
      href={href}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
      onClick={event => event.stopPropagation()}
      title="Abrir conversa no WhatsApp"
      aria-label={`Abrir conversa no WhatsApp para ${phone}`}
    >
      {phone}
    </a>
  );
}
