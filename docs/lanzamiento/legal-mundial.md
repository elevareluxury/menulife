# Legal para todo el mundo: qué cubren los textos y qué falta

Revisión del 20/11/2026 de `/terminos` y `/privacidad` (12 idiomas, `src/i18n/app/legal/`). Hecha sin abogado: los
textos siguen las reglas de cada ley, pero conviene que un abogado los lea cuando se pueda (sobre todo antes de cobrar o
de constituir una sociedad).

## Lo que ya cubren los textos

| Ley o regla | Dónde |
|---|---|
| GDPR / UK GDPR (UE, Reino Unido, Suiza): responsable, datos, bases legales por finalidad, oposición al interés legítimo, sin decisiones automatizadas, transferencias (Argentina adecuada, DPF, cláusulas tipo), plazos, brechas en 72 h, derechos y plazo de un mes, autoridad de control, menores | Privacidad: responsable, datos, para-que, transferencias, plazos, seguridad, derechos, segun-pais, menores |
| ePrivacy (cookies): sólo almacenamiento estrictamente necesario, sin banner | Privacidad: dispositivo |
| Reglamento de Servicios Digitales (DSA): punto de contacto, cómo moderamos (herramientas + personas), motivo de cada medida, revisión, resolución extrajudicial, aviso a autoridades | Términos: quien, reglas |
| Ley 25.326 (Argentina): plazos de acceso y rectificación, AAIP, cláusulas modelo | Privacidad: derechos, transferencias |
| LGPD (Brasil): canal del encarregado, derechos extra, ANPD | Privacidad: responsable, segun-pais |
| CCPA/CPRA y leyes de estados de EE. UU.: categorías, dato sensible (ánimo), no venta ni “sharing”, GPC, representante autorizado, no discriminación, apelación | Privacidad: segun-pais |
| COPPA y edades mínimas (13; 14 en Corea y China; hasta 16 en la UE) + aviso a menores de 18 | Términos: edad · Privacidad: menores |
| DMCA (EE. UU.): elementos del pedido (firma, declaración bajo pena de perjurio) y contranotificación con 10–14 días | Términos: derechos-de-autor |
| App Store (Apple): condiciones mínimas de un contrato propio (Apple no es parte, soporte, garantía, reclamos, embargos, tercero beneficiario) | Términos: apps |
| Leyes de publicidad (influencers): aclarar publicidad paga o canjes; datos de terceros con permiso | Términos: contenido |
| Canadá (PIPEDA), Australia (APP), Japón (APPI), Corea (PIPA), India (DPDP): derechos básicos y autoridad | Privacidad: segun-pais |
| Consumidores: límite de responsabilidad con excepciones, ley del domicilio, idioma de referencia salvo ley local | Términos: servicio, ley · ui.reference |

## Lo que falta y depende del dueño (no se resuelve con texto)

1. **Representante en la UE y en el Reino Unido** (GDPR art. 27, UK GDPR art. 27 y DSA art. 13). Mycen no tiene
   establecimiento allí y ofrece el servicio a personas de esos lugares, así que la ley pide nombrar un representante.
   Hay servicios que lo hacen por una cuota anual. Cuando esté, sumar nombre y dirección en Privacidad → responsable y
   Términos → quien (12 idiomas).
2. **Agente DMCA** (EE. UU.): registrarlo en el U.S. Copyright Office (dmca.copyright.gov, US$ 6, se renueva cada 3
   años) para tener la protección de “safe harbor”. Después, sumar su contacto en Términos → derechos-de-autor.
3. **Corea del Sur y China continental**: sus leyes piden un consentimiento **separado** para mandar datos fuera del país
   (con destinatario, país, datos, finalidad y plazo) y, en China, también para datos sensibles. Hoy no hay esa casilla
   aparte. Decidir: sumarla al registro para esos países (es código) o no ofrecer Mycen activamente allí.
4. **Sociedad**: hoy el responsable es Luca Cazzoli (monotributo) con el nombre de fantasía Resilio. Si se arma una
   sociedad, cambiar el responsable en los 12 idiomas (comentario `RESPONSABLE` en `legal/es.ts`).
5. **Revisión de un abogado**: con lo anterior resuelto, que un abogado con experiencia en protección de datos lea la
   versión en español (es la de referencia).
6. **Si se abre Mycen Business con pagos**: revisar Términos → pagos (impuestos, reembolsos, arrepentimiento) y las
   reglas de cada tienda para cobrar dentro de la app.
