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
    supportTitle: 'Ajuda e suporte',
    supportIntro: 'Como falar com a gente e respostas às perguntas mais comuns.',
    deletionTitle: 'Excluir sua conta Mycen',
    deletionIntro: 'Como excluir sua conta e seus dados do Mycen (app e web), o que é apagado e o que pode ficar.',
  },
  updated: es.updated,
  support: [
    { id: 'contacto', title: 'Escreva para a gente', body: [
      'Para qualquer dúvida, problema ou pedido, escreva para **team@mycen.id**. Diga seu usuário do Mycen (ou o e-mail da conta) e, se puder, mande uma captura de tela. Respondemos o quanto antes.',
    ] },
    { id: 'acceso', title: 'Entrar na sua conta', body: [
      { list: [
        '**Esqueci minha senha:** na tela de acesso toque em “Esqueceu sua senha?” e siga o link que chega por e-mail.',
        '**Não recebi o e-mail de confirmação:** confira spam e promoções. Se não estiver lá, cadastre-se de novo com o mesmo e-mail e enviamos outra vez.',
        '**Entrei com o Google:** use sempre o mesmo botão; não precisa de senha.',
      ] },
    ] },
    { id: 'datos', title: 'Seus dados', body: [
      { list: [
        '**Baixar:** Studio → Ajustes → “Baixar meus dados” (seu perfil, módulos e Life OS em um arquivo). Em Life OS → Ajustes → “Seus dados” você também pode baixar Dinheiro em CSV.',
        '**Excluir sua conta:** em Studio → Ajustes ou Life OS → Ajustes → Conta. Todos os passos, e o que é apagado, em **mycen.id/eliminar-cuenta**.',
      ] },
    ] },
    { id: 'seguridad', title: 'Denunciar ou bloquear', body: [
      { list: [
        '**Um perfil:** em qualquer perfil público toque em “Denunciar”. A equipe do Mycen revisa e o dono não sabe quem denunciou.',
        '**Uma mensagem:** em Studio → Mensagens, “Denunciar” envia a mensagem para a equipe e bloqueia quem escreveu; “Bloquear” só para de receber as mensagens dessa pessoa.',
      ] },
      'Se algo for urgente ou colocar alguém em risco, escreva para **team@mycen.id** com o assunto “Urgente”.',
    ] },
  ],
  deletion: [
    { id: 'app', title: 'Pelo app ou pela web', body: [
      'Entre na sua conta e escolha uma destas opções:',
      { list: [
        '**Life OS → Ajustes → Conta → “Excluir minha conta”**',
        '**Studio → Ajustes → “Excluir minha conta”**',
      ] },
      'Para confirmar, digite a palavra que pedimos. A conta é apagada na hora.',
    ] },
    { id: 'sin-acceso', title: 'Se você não consegue entrar', body: [
      'Escreva para **team@mycen.id** a partir do e-mail da sua conta, com o assunto “Excluir minha conta”. Apagamos dentro dos prazos da lei (na Argentina, 5 dias úteis) e avisamos quando estiver feito.',
    ] },
    { id: 'que-se-borra', title: 'O que é apagado', body: [
      { list: [
        'Sua conta e seu e-mail de acesso.',
        'Sua identidade: perfis, Spaces, módulos, projetos, imagens, versões publicadas, estatísticas, mensagens e inscritos.',
        'Todo o Life OS: tarefas, hábitos, metas, Meu dia, revisões, Dinheiro e diário.',
      ] },
    ] },
    { id: 'que-queda', title: 'O que pode ficar', body: [
      { list: [
        'As cópias de segurança dos fornecedores, que são sobrescritas nos ciclos habituais.',
        'Os registros de erros, que não estão vinculados à sua conta.',
        'O que a lei obrigar a guardar (por exemplo, dados de faturamento), pelo prazo que ela fixar.',
        'Se sua conta tem um negócio no Mycen Business, escreva para a gente: encerramos junto com você para cuidar dos dados de clientes e vendas.',
      ] },
    ] },
  ],
  terms: [
    // RESPONSABLE: Luca Cazzoli (monotributo, CUIT 20-42325961-3), nombre de fantasía Resilio. Si se arma una sociedad, cambiar acá en los 12.
    { id: 'quien', title: 'Quem presta o serviço', body: [
      'O Mycen é um serviço operado por **Luca Cazzoli** (CUIT 20-42325961-3, identificação fiscal argentina), sob o nome fantasia **Resilio**, com domicílio na República Argentina. Você pode nos escrever em **team@mycen.id**.',
      'O Mycen permite criar uma identidade digital pública (Mycen Identity), administrá-la pelo Mycen Studio, organizar sua vida pessoal no Life OS e, se você tem um negócio, geri-lo com o Mycen Business.',
    ] },
    { id: 'edad', title: 'Quem pode usar o Mycen', body: [
      'Para usar o Mycen você precisa ter pelo menos **13 anos**. Se você mora em um país da União Europeia ou do Espaço Econômico Europeu que exige **16 anos** para usar um serviço como este sem o consentimento da sua mãe, pai ou responsável, você precisa ter pelo menos 16. E se a lei do seu país fixar uma idade mínima maior, vale essa.',
      'Ao criar uma conta você confirma que tem a idade necessária. Se soubermos que uma conta é de alguém que não a tem, nós a excluímos.',
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
    { id: 'derechos-de-autor', title: 'Direitos autorais e outros direitos', body: [
      'Se você acredita que algo publicado no Mycen infringe seus direitos autorais ou outros direitos (por exemplo, sua marca ou sua imagem), pode nos pedir que o removamos. Escreva para **team@mycen.id** com:',
      { list: [
        '**O link do conteúdo:** o endereço exato no Mycen do perfil, projeto ou imagem.',
        '**Quem é o titular** do direito e como contatá-lo. Se você age em nome de outra pessoa ou empresa, informe.',
        '**Por que infringe:** qual obra, marca ou outro direito é e como está sendo usado sem permissão.',
        '**Uma declaração de boa-fé:** que você acredita de boa-fé que esse uso não é autorizado e que as informações que nos dá são corretas.',
      ] },
      'Analisamos cada pedido. Se for o caso, removemos ou bloqueamos o conteúdo e avisamos quem o publicou, com o motivo. Essa pessoa pode nos responder com sua versão (por exemplo, se tem permissão para usá-lo) e analisamos de novo.',
      'Contas que publicam repetidamente conteúdo que infringe direitos de outros podem ser suspensas ou encerradas.',
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
    // RESPONSABLE: Luca Cazzoli (monotributo, CUIT 20-42325961-3), nombre de fantasía Resilio. Si se arma una sociedad, cambiar acá en los 12.
    { id: 'responsable', title: 'Quem é responsável pelos seus dados', body: [
      'O controlador dos dados é **Luca Cazzoli** (CUIT 20-42325961-3, identificação fiscal argentina), que opera o Mycen sob o nome fantasia **Resilio**, com domicílio na República Argentina. Para qualquer dúvida sobre seus dados, escreva para **team@mycen.id**.',
      'Quando um negócio usa o Mycen Business para gerir dados dos próprios clientes (pedidos, reservas, horários), esse negócio é o controlador desses dados e o Mycen os trata em seu nome e seguindo suas instruções.',
    ] },
    { id: 'datos', title: 'Quais dados usamos', body: [
      { list: [
        '**Sua conta:** nome, e-mail, senha (guardada criptografada, nunca a vemos), idioma, moeda, fuso horário e a data em que você aceitou estas condições.',
        '**Seu perfil público:** o que você cadastra no Studio (nome, foto, textos, links, projetos, cartão de contato). Só é publicado o que você decide mostrar.',
        '**Life OS:** suas metas, hábitos, tarefas, finanças e notas, incluindo os nomes que você escrever (por exemplo, com quem dividiu um gasto). São privados: só você pode vê-los. Seu diário também: o bloqueio com PIN, digital ou rosto funciona só no seu dispositivo (não vai para a Mycen) e as entradas não têm criptografia de ponta a ponta.',
        '**Mycen Business:** os dados do seu negócio e o que você cadastrar sobre seus clientes e vendas.',
        '**Estatísticas de visitas:** eventos anônimos (visitas e cliques no seu perfil) com um identificador que muda todos os dias. Não guardamos endereços IP nem dados do dispositivo, e não contamos robôs. Também guardamos de qual site ou link veio a visita (por exemplo, Instagram ou o QR).',
        '**Denúncias:** o motivo e o detalhe escritos por quem denuncia, com um identificador anônimo diário para evitar abusos. Se quem denuncia estiver com a sessão iniciada, guardamos também a conta: só a equipe do Mycen a vê, nunca a pessoa denunciada.',
        '**Mensagens do formulário de contato:** o nome, o contato (e-mail ou WhatsApp) e a mensagem que um visitante deixa. Se o perfil tem o módulo Colaborações, uma marca deixa também a empresa e o que procura e, se quiser, o site, um orçamento e um prazo. Só a pessoa dona do perfil as vê, no Studio; não são publicadas nem enviadas por e-mail. Para evitar abusos usamos um identificador anônimo que muda todos os dias, sem IP nem dados do dispositivo. Se o dono do perfil denunciar uma mensagem, guardamos uma cópia para a equipe do Mycen revisar e esse contato fica bloqueado no perfil.',
        '**Inscrições:** se você se inscrever pelo módulo “Inscrever-se” de um perfil, guardamos seu e-mail (e seu nome, se o perfil pedir), a data em que você deu seu consentimento e seu idioma, e os entregamos à pessoa dona desse perfil, que os vê no Studio e pode exportá-los. A Mycen não envia nada a essa lista: a pessoa dona do perfil decide como usá-la e é responsável por fazê-lo corretamente. Para sair, peça a essa pessoa ou escreva para team@mycen.id e nós apagamos. Para evitar abusos, usamos um identificador anônimo que muda todos os dias, sem IP nem dados do dispositivo.',
        '**Convites:** se você criar sua conta a partir de “Crie sua identidade” no perfil de outra pessoa, guardamos qual perfil trouxe você e o tipo dele, para entender como o Mycen cresce. Essa pessoa não vê seus dados.',
        '**Uso do app:** para saber se o Mycen funciona e como está crescendo, guardamos eventos de uso (por exemplo, que você publicou seu perfil, abriu “Meu dia” ou marcou um hábito) com sua conta, a data e dados curtos como a estrutura escolhida ou um número de dias. Além disso, uma vez por dia anotamos que você usou o Mycen, de que tipo de dispositivo (navegador, app instalado, iPhone ou Android), em que idioma e o fuso horário do dispositivo (por exemplo, “America/Argentina/Buenos_Aires”); nunca seu IP nem sua localização exata. Nunca guardamos o conteúdo das suas tarefas, hábitos, notas ou mensagens. Não usamos serviços de análise de terceiros.',
        '**Verificação da conta:** se você pedir o selo de conta verificada, guardamos sua mensagem, o link que você nos passar e a resposta. Só a equipe Mycen vê esses dados, para revisar o pedido; se for aprovado, seu perfil mostra o selo.',
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
        '**Cloudflare (Turnstile):** a verificação anti-bots do cadastro, do login e da recuperação de senha. Ao abrir essas telas, a Cloudflare recebe dados técnicos do seu navegador (como o endereço IP) só para verificar que você não é um bot.',
        '**YouTube, Vimeo, TikTok, Spotify e SoundCloud:** só se um perfil integrar um vídeo ou uma música e você tocar em "Reproduzir". Antes disso não nos conectamos a eles; a partir daí valem as políticas deles. Se um perfil mostra o seu "Último vídeo", o servidor do Mycen consulta a lista pública de vídeos do canal do YouTube escolhido pelo dono, sem enviar nenhum dado seu. Quando o dono de um perfil cola um desses links no Studio, o servidor do Mycen busca a capa pública desse vídeo ou dessa música e a guarda como mais uma foto do perfil: assim a página a mostra sem conectar você ao provedor.',
        '**Anthropic:** só se um negócio usa a importação do cardápio a partir de um PDF; esse arquivo é processado.',
        '**Mercado Pago:** só se um negócio o configura para receber pagamentos; o pagamento é feito no Mercado Pago.',
        '**Google (login):** só se você escolher "Continuar com o Google". O Google nos confirma seu nome, seu email e sua foto; não recebemos sua senha do Google nem acessamos mais nada da sua conta.',
        '**Apple (login):** só se você escolher "Continuar com a Apple". A Apple nos confirma seu nome e seu email (ou um email de encaminhamento que a Apple cria se você preferir ocultar o seu); não recebemos sua senha nem acessamos mais nada da sua conta.',
        '**App para iOS e Android:** se você baixar, a Apple (App Store) ou o Google (Google Play) registram o download conforme as políticas deles. Os lembretes do app são programados no seu celular; o Mycen não usa um serviço de notificações de terceiros.',
        '**Google Agenda, Apple ou outra agenda:** só se você ativar o link de agenda do Life OS; esse serviço baixa suas tarefas pendentes com data (título, data, horário e lembrete). Você pode desativar ou trocar quando quiser.',
        '**Reconhecimento de voz do seu navegador:** só se você usar "Ditar" no Life OS. Seu navegador converte a voz em texto (no Chrome, quem faz isso é o serviço de voz do Google; no Safari, a Apple). O Mycen recebe só o texto.',
      ] },
      'Fora isso, só compartilhamos dados se a lei exigir ou para proteger os direitos e a segurança das pessoas.',
    ] },
    { id: 'transferencias', title: 'Dados fora do seu país', body: [
      'Nossos fornecedores podem guardar ou processar dados em servidores de outros países, como os Estados Unidos ou países da União Europeia. Quando isso acontece, usamos as garantias previstas em lei, como cláusulas contratuais aprovadas pelas autoridades de proteção de dados, para que seus dados tenham um nível de proteção adequado.',
    ] },
    { id: 'plazos', title: 'Por quanto tempo os guardamos', body: [
      { list: [
        'Os dados da sua conta, do seu perfil e do Life OS, enquanto você tiver a conta. Se você a excluir, apagamos; as cópias de segurança dos fornecedores são sobrescritas em seus ciclos habituais.',
        'As estatísticas de visitas são guardadas como eventos anônimos (com o identificador que muda todo dia) enquanto o perfil existir; se ele for apagado, são apagadas junto.',
        'As mensagens do formulário de contato, até que a pessoa dona do perfil as apague ou exclua a conta.',
        'Os e-mails de inscrição, até que a pessoa dona do perfil os apague, exclua a conta ou você nos peça para apagá-los.',
        'Os registros de erros são guardados enquanto servirem para corrigi-los (um resolvido continua guardado caso volte a acontecer); a contagem de pessoas afetadas, 90 dias.',
        'Os eventos de uso, enquanto você tiver a conta; se você a excluir, deixam de ter qualquer vínculo com você.',
        'O que a lei obrigar a conservar (por exemplo, dados de faturamento), pelo prazo que ela fixar.',
      ] },
    ] },
    { id: 'dispositivo', title: 'O que fica no seu dispositivo', body: [
      'O Mycen não usa cookies de publicidade nem de rastreamento. No seu navegador guardamos só o necessário para funcionar: sua sessão, seu idioma e alguns rascunhos e preferências. Você pode apagar isso nas configurações do navegador (vai precisar entrar de novo). Se você registrar algo no Life OS sem conexão, isso fica no seu dispositivo até ser enviado (só com a sua sessão). Do PIN do diário guardamos só uma impressão cifrada (hash), nunca o PIN.',
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
      'O Mycen não é dirigido a menores de 13 anos, nem a menores de 16 nos países da União Europeia ou do Espaço Econômico Europeu que exigem essa idade para tratar seus dados sem o consentimento dos pais (nem a quem não tenha a idade maior fixada pela lei do seu país). Não coletamos intencionalmente dados de pessoas abaixo dessa idade: se soubermos que uma conta é de alguém que não a tem, excluímos a conta e seus dados. Se você é mãe, pai ou responsável e acredita que isso aconteceu, escreva para **team@mycen.id**.',
    ] },
    { id: 'cambios', title: 'Mudanças nesta política', body: [
      'Se mudarmos esta política de forma importante, avisaremos por e-mail ou dentro do Mycen antes que seja aplicada. No topo você sempre verá a data da última atualização.',
    ] },
  ],
}

export default pt
