import type { LegalDict } from './es'
import es from './es'

const pt: LegalDict = {
  ui: {
    termsTitle: 'Termos e condições',
    privacyTitle: 'Política de privacidade',
    termsIntro: 'Ao criar uma conta ou usar o Mycen, você aceita estas condições. Elas foram escritas para serem entendidas.',
    privacyIntro: 'Quais dados usamos, para quê, com quem compartilhamos e que controle você tem.',
    updated: 'Última atualização',
    contents: 'Conteúdo',
    reference: 'A versão em espanhol é a de referência. As traduções são para sua comodidade; se houver diferenças, vale o texto em espanhol.',
    seeOther: { terms: 'Política de privacidade', privacy: 'Termos e condições' },
    language: 'Idioma',
    back: 'Voltar ao Mycen',
  },
  updated: es.updated,
  terms: [
    { id: 'quien', title: 'Quem presta o serviço', body: [
      'O Mycen é um serviço operado por **Resilio**, com domicílio na República Argentina. Você pode nos escrever em **team@mycen.id**.',
      'O Mycen permite criar uma identidade digital pública (Mycen Identity), administrá-la pelo Mycen Studio, organizar sua vida pessoal no Life OS e, se você tem um negócio, geri-lo com o Mycen Business.',
    ] },
    { id: 'edad', title: 'Quem pode usar o Mycen', body: [
      'Você precisa ter pelo menos **13 anos**. Se no seu país a idade mínima para aceitar estas condições ou para o tratamento dos seus dados for maior (por exemplo, 16 em alguns países da União Europeia), você precisa ter essa idade ou a autorização da sua mãe, pai ou responsável.',
      'Para usar o Mycen Business em nome de um negócio, você precisa ser maior de idade e ter autorização para representá-lo.',
    ] },
    { id: 'cuenta', title: 'Sua conta', body: [
      'Você é responsável por manter sua senha segura e pelo que acontece na sua conta. Os dados que você cadastrar precisam ser verdadeiros e seus, ou você precisa ter permissão para usá-los.',
      'Se notar algum uso que não autorizou, troque sua senha e nos escreva.',
    ] },
    { id: 'contenido', title: 'Seu conteúdo', body: [
      'O que você publica continua sendo seu. Você nos dá uma permissão gratuita e mundial para guardá-lo, exibi-lo no seu endereço público e adaptá-lo tecnicamente (por exemplo, reduzir imagens) enquanto estiver publicado. Você pode editar, ocultar, despublicar ou excluir quando quiser.',
      'O que você publicar precisa cumprir as regras de conteúdo. Podemos ocultar ou suspender o que não cumprir.',
    ] },
    { id: 'reglas', title: 'Regras de conteúdo', body: [
      'No Mycen não é permitido publicar:',
      { list: [
        '**Spam ou publicidade enganosa:** promessas falsas, links que não levam aonde dizem ou avaliações inventadas.',
        '**Golpes ou fraude:** pedir dinheiro ou dados com enganos, vender o que não existe.',
        '**Falsificação de identidade:** fingir ser outra pessoa, empresa ou marca.',
        '**Ódio ou assédio:** atacar pessoas ou grupos pelo que são, ou assediar alguém.',
        '**Violência ou ameaças:** ameaçar, incitar a violência ou exibi-la de forma gratuita.',
        '**Conteúdo sexual explícito**, e qualquer conteúdo sexual envolvendo menores (denunciado às autoridades).',
        '**Algo ilegal:** produtos ou serviços proibidos, ou conteúdo que viole direitos de terceiros (marcas, fotos, textos).',
        '**Links maliciosos:** vírus, phishing ou sites enganosos.',
      ] },
      'Qualquer pessoa pode denunciar um perfil ou projeto pelo link "Denunciar" no rodapé da página, sem conta e de forma anônima. Revisamos cada denúncia. Se um perfil não cumpre as regras, nós o suspendemos: ele deixa de ser exibido (página, projetos e cartão de contato) e o dono vê o motivo no Studio. Se você acha que foi um erro, escreva-nos a partir da conta com que o criou e revisaremos de novo.',
    ] },
    { id: 'derechos-de-autor', title: 'Direitos autorais e marcas', body: [
      'Se você acredita que algo publicado no Mycen usa sua obra ou sua marca sem permissão, escreva para **team@mycen.id** com: seus dados de contato, qual obra ou marca é sua, o endereço exato do conteúdo no Mycen e uma declaração de que as informações são corretas e de que você é o titular ou age em nome dele.',
      'Se a reclamação for válida, removemos ou bloqueamos o conteúdo e avisamos quem o publicou, que pode responder com sua versão. Quem publicar repetidamente conteúdo de outros sem permissão pode perder a conta.',
    ] },
    { id: 'usernames', title: 'Nomes de usuário', body: [
      'Alguns nomes estão reservados. Não é permitido registrar nomes para se passar por outra pessoa ou marca, nem para revendê-los; nesses casos podemos recuperá-los. Se você mudar seu username, o endereço anterior redireciona para o novo para que seus links e QR continuem funcionando.',
    ] },
    { id: 'pagos', title: 'Planos pagos do Mycen Business', body: [
      'Sua identidade, o Studio e o Life OS são grátis. Os planos do Mycen Business têm o preço exibido na contratação, em dólares americanos (US$), mais os impostos aplicáveis no seu país.',
      'Não há fidelidade: você pode cancelar quando quiser e o plano continua ativo até o fim do período pago. Se mudarmos um preço, avisaremos antes e a mudança vale a partir do período seguinte. Se você for consumidor, mantém os direitos que a lei do seu país lhe dá, como o direito de arrependimento em compras a distância.',
    ] },
    { id: 'servicio', title: 'O serviço', body: [
      'Trabalhamos para que o Mycen funcione sempre e bem, mas pode haver interrupções, erros ou mudanças. As funções podem mudar, melhorar ou deixar de estar disponíveis; se algo importante mudar, avisaremos com antecedência quando possível.',
      'Na medida permitida pela lei, o Mycen é oferecido "no estado em que se encontra", e não respondemos por danos indiretos nem por lucros cessantes decorrentes do uso do serviço. Nada disso limita os direitos que a lei do seu país não permite limitar, como os direitos de quem usa o serviço como consumidor.',
    ] },
    { id: 'baja', title: 'Cancelamento e suspensão', body: [
      'Você pode excluir sua conta quando quiser em Studio → Configurações, e baixar antes uma cópia dos seus dados. Contas com um negócio ativo no Mycen Business são canceladas pelo suporte, porque envolvem dados de clientes e vendas.',
      'Podemos suspender ou encerrar contas que descumpram estas condições ou a lei, ou que coloquem em risco outras pessoas ou o serviço. Quando possível, avisaremos e explicaremos o motivo.',
    ] },
    { id: 'cambios', title: 'Mudanças nestas condições', body: [
      'Se mudarmos estas condições de forma importante, avisaremos por e-mail ou dentro do Mycen antes que entrem em vigor. Se não concordar, você pode deixar de usar o serviço e excluir sua conta.',
    ] },
    { id: 'ley', title: 'Lei aplicável', body: [
      'Estas condições são regidas pelas leis da República Argentina. Se você usa o Mycen como consumidor a partir de outro país, também é protegido pelas normas do seu país que não podem ser afastadas por contrato, e pode reclamar nos tribunais do seu domicílio.',
      'Antes de qualquer reclamação, escreva para **team@mycen.id**: quase tudo se resolve conversando.',
    ] },
  ],
  privacy: [
    { id: 'responsable', title: 'Quem é responsável pelos seus dados', body: [
      'O controlador dos dados é **Resilio**, com domicílio na República Argentina, que opera o Mycen. Para qualquer dúvida sobre seus dados, escreva para **team@mycen.id**.',
      'Quando um negócio usa o Mycen Business para gerir dados dos próprios clientes (pedidos, reservas, horários), esse negócio é o controlador desses dados e o Mycen os trata em seu nome e seguindo suas instruções.',
    ] },
    { id: 'datos', title: 'Quais dados usamos', body: [
      { list: [
        '**Sua conta:** nome, e-mail, senha (guardada criptografada, nunca a vemos), idioma, moeda, fuso horário e a data em que você aceitou estas condições.',
        '**Seu perfil público:** o que você cadastra no Studio (nome, foto, textos, links, projetos, cartão de contato). Só é publicado o que você decide mostrar.',
        '**Life OS:** suas metas, hábitos, tarefas, finanças e notas. São privados: só você pode vê-los.',
        '**Mycen Business:** os dados do seu negócio e o que você cadastrar sobre seus clientes e vendas.',
        '**Estatísticas de visitas:** eventos anônimos (visitas e cliques no seu perfil) com um identificador que muda todos os dias. Não guardamos endereços IP nem dados do dispositivo, e não contamos robôs.',
        '**Denúncias:** o motivo e o detalhe escritos por quem denuncia, com um identificador anônimo diário para evitar abusos.',
        '**Mensagens do formulário de contato:** o nome, o contato (e-mail ou WhatsApp) e a mensagem que um visitante deixa. Só a pessoa dona do perfil as vê, no Studio; não são publicadas nem enviadas por e-mail. Para evitar abusos usamos um identificador anônimo que muda todos os dias, sem IP nem dados do dispositivo.',
        '**Convites:** se você criar sua conta a partir de “Crie sua identidade” no perfil de outra pessoa, guardamos qual perfil trouxe você e o tipo dele, para entender como o Mycen cresce. Essa pessoa não vê seus dados.',
        '**Erros técnicos:** quando algo falha, guardamos a mensagem de erro, a tela, a versão do Mycen e o navegador (por exemplo, "Chrome 128 · Android"), sem IP nem dados pessoais, para poder corrigir.',
      ] },
    ] },
    { id: 'para-que', title: 'Para que os usamos e com que base', body: [
      { list: [
        '**Prestar o serviço** que você pediu ao criar sua conta: guardar, exibir e sincronizar suas informações (execução do contrato).',
        '**Manter o Mycen seguro e funcionando:** prevenir abusos, revisar denúncias e corrigir erros (legítimo interesse).',
        '**Mostrar estatísticas** do seu perfil, de forma anônima (legítimo interesse).',
        '**Enviar e-mails necessários** sobre sua conta: confirmação, recuperação de senha e mudanças importantes.',
        '**Cumprir a lei** quando uma autoridade competente exigir.',
      ] },
      'Não vendemos seus dados, não os usamos para publicidade e não há rastreadores de terceiros no Mycen.',
    ] },
    { id: 'publico', title: 'O que é público', body: [
      'Sua página pública mostra só o que você publica. Módulos ocultos, rascunhos e Spaces não publicados não aparecem. Perfis públicos podem aparecer em buscadores; se você escolher a visibilidade "não listado" ou "privado", eles não entram no mapa do site que os buscadores leem.',
    ] },
    { id: 'proveedores', title: 'Com quem compartilhamos', body: [
      'Usamos fornecedores que tratam dados apenas para prestar o serviço e sob contrato:',
      { list: [
        '**Supabase:** banco de dados, login e arquivos.',
        '**Vercel:** hospedagem do aplicativo e entrega das páginas.',
        '**Resend:** envio dos e-mails da sua conta.',
        '**YouTube, Vimeo, TikTok, Spotify e SoundCloud:** só se um perfil integrar um vídeo ou uma música e você tocar em "Reproduzir". Antes disso não nos conectamos a eles; a partir daí valem as políticas deles.',
        '**Anthropic:** só se um negócio usa a importação do cardápio a partir de um PDF; esse arquivo é processado.',
        '**Mercado Pago:** só se um negócio o configura para receber pagamentos; o pagamento é feito no Mercado Pago.',
      ] },
      'Fora isso, só compartilhamos dados se a lei exigir ou para proteger os direitos e a segurança das pessoas.',
    ] },
    { id: 'transferencias', title: 'Dados fora do seu país', body: [
      'Nossos fornecedores podem guardar ou processar dados em servidores de outros países, como os Estados Unidos ou países da União Europeia. Quando isso acontece, usamos as garantias previstas em lei, como cláusulas contratuais aprovadas pelas autoridades de proteção de dados, para que seus dados tenham um nível de proteção adequado.',
    ] },
    { id: 'plazos', title: 'Por quanto tempo os guardamos', body: [
      { list: [
        'Os dados da sua conta, do seu perfil e do Life OS, enquanto você tiver a conta. Se você a excluir, apagamos; as cópias de segurança dos fornecedores são sobrescritas em seus ciclos habituais.',
        'As estatísticas de visitas são guardadas agrupadas e anônimas.',
        'As mensagens do formulário de contato, até que a pessoa dona do perfil as apague ou exclua a conta.',
        'Os registros de erros são guardados até serem resolvidos; a contagem de pessoas afetadas, 90 dias.',
        'O que a lei obrigar a conservar (por exemplo, dados de faturamento), pelo prazo que ela fixar.',
      ] },
    ] },
    { id: 'dispositivo', title: 'O que fica no seu dispositivo', body: [
      'O Mycen não usa cookies de publicidade nem de rastreamento. No seu navegador guardamos só o necessário para funcionar: sua sessão, seu idioma e alguns rascunhos e preferências. Você pode apagar isso nas configurações do navegador (vai precisar entrar de novo).',
    ] },
    { id: 'seguridad', title: 'Segurança', body: [
      'Usamos conexões criptografadas, senhas guardadas com criptografia e permissões no banco de dados para que cada pessoa veja só o que é seu. Nenhum sistema é perfeito: se acontecer algo que afete seus dados, avisaremos e agiremos conforme a lei.',
    ] },
    { id: 'derechos', title: 'Seus direitos', body: [
      'Você pode pedir para acessar seus dados, corrigi-los, apagá-los, levá-los com você (portabilidade), se opor ou limitar certos usos e retirar um consentimento que tenha dado. Muitas coisas você faz direto em Studio → Configurações (baixar seus dados, excluir sua conta) ou em Life OS → Configurações → Seus dados. Para o resto, escreva para **team@mycen.id** a partir do e-mail da sua conta.',
      'Respondemos dentro dos prazos legais (na Argentina, 10 dias corridos para o acesso e 5 dias úteis para corrigir ou apagar). Você também pode reclamar à autoridade de proteção de dados: na Argentina, a **Agencia de Acceso a la Información Pública (AAIP)**; na União Europeia, a autoridade do seu país; no Brasil, a **ANPD**.',
      'Se você mora na Califórnia: não vendemos nem compartilhamos seus dados pessoais para publicidade, e não vamos tratá-lo de forma diferente por exercer seus direitos.',
    ] },
    { id: 'menores', title: 'Menores', body: [
      'O Mycen não é dirigido a menores de 13 anos. Se soubermos que uma conta é de alguém abaixo dessa idade (ou da fixada pela lei do seu país) sem autorização, nós a excluímos. Se você é mãe, pai ou responsável e acredita que isso aconteceu, escreva-nos.',
    ] },
    { id: 'cambios', title: 'Mudanças nesta política', body: [
      'Se mudarmos esta política de forma importante, avisaremos por e-mail ou dentro do Mycen antes que seja aplicada. No topo você sempre verá a data da última atualização.',
    ] },
  ],
}

export default pt
