import type { LegalDict } from './es'
import es from './es'

const pt: LegalDict = {
  ui: {
    termsTitle: "Termos e condições",
    privacyTitle: "Política de privacidade",
    termsIntro: "Ao criar uma conta ou usar o Mycen, você aceita estas condições. Elas foram escritas para serem entendidas.",
    privacyIntro: "Quais dados usamos, para quê, com quem compartilhamos e que controle você tem.",
    updated: "Última atualização",
    contents: "Conteúdo",
    reference: "A versão em espanhol é a de referência. As traduções são para sua comodidade; se houver diferenças, vale o texto em espanhol, salvo se a lei do seu país disser outra coisa.",
    seeOther: { terms: "Política de privacidade", privacy: "Termos e condições" },
    language: "Idioma",
    back: "Voltar ao Mycen",
    supportTitle: "Ajuda e suporte",
    supportIntro: "Como falar com a gente e respostas às perguntas mais comuns.",
    deletionTitle: "Excluir sua conta Mycen",
    deletionIntro: "Como excluir sua conta e seus dados do Mycen (app e web), o que é apagado e o que pode ficar.",
  },
  updated: es.updated,
  support: [
    { id: "contacto", title: "Escreva para a gente", body: [
      "Para qualquer dúvida, problema ou pedido, escreva para **team@mycen.id**. Diga seu usuário do Mycen (ou o e-mail da conta) e, se puder, mande uma captura de tela. Respondemos o quanto antes.",
    ] },
    { id: "acceso", title: "Entrar na sua conta", body: [
      { list: [
        "**Esqueci minha senha:** na tela de acesso toque em “Esqueceu sua senha?” e siga o link que chega por e-mail.",
        "**Não recebi o e-mail de confirmação:** confira spam e promoções. Se não estiver lá, cadastre-se de novo com o mesmo e-mail e enviamos outra vez.",
        "**Entrei com o Google:** use sempre o mesmo botão; não precisa de senha.",
      ] },
    ] },
    { id: "datos", title: "Seus dados", body: [
      { list: [
        "**Baixar:** Studio → Ajustes → “Baixar meus dados” (seu perfil, módulos e Life OS em um arquivo). Em Life OS → Ajustes → “Seus dados” você também pode baixar Dinheiro em CSV.",
        "**Excluir sua conta:** em Studio → Ajustes ou Life OS → Ajustes → Conta. Todos os passos, e o que é apagado, em **mycen.id/eliminar-cuenta**.",
      ] },
    ] },
    { id: "seguridad", title: "Denunciar ou bloquear", body: [
      { list: [
        "**Um perfil:** em qualquer perfil público toque em “Denunciar”. A equipe do Mycen revisa e o dono não sabe quem denunciou.",
        "**Uma mensagem:** em Studio → Mensagens, “Denunciar” envia a mensagem para a equipe e bloqueia quem escreveu; “Bloquear” só para de receber as mensagens dessa pessoa.",
      ] },
      "Se algo for urgente ou colocar alguém em risco, escreva para **team@mycen.id** com o assunto “Urgente”.",
    ] },
  ],
  deletion: [
    { id: "app", title: "Pelo app ou pela web", body: [
      "Entre na sua conta e escolha uma destas opções:",
      { list: [
        "**Life OS → Ajustes → Conta → “Excluir minha conta”**",
        "**Studio → Ajustes → “Excluir minha conta”**",
      ] },
      "Para confirmar, digite a palavra que pedimos. A conta é apagada na hora.",
    ] },
    { id: "sin-acceso", title: "Se você não consegue entrar", body: [
      "Escreva para **team@mycen.id** a partir do e-mail da sua conta, com o assunto “Excluir minha conta”. Apagamos dentro dos prazos da lei (na Argentina, 5 dias úteis) e avisamos quando estiver feito.",
    ] },
    { id: "que-se-borra", title: "O que é apagado", body: [
      { list: [
        "Sua conta e seu e-mail de acesso.",
        "Sua identidade: perfis, Spaces, módulos, projetos, imagens, versões publicadas, estatísticas, mensagens e inscritos.",
        "Todo o Life OS: tarefas, hábitos, metas, Meu dia, revisões, Dinheiro e diário.",
      ] },
    ] },
    { id: "que-queda", title: "O que pode ficar", body: [
      { list: [
        "As cópias de segurança dos fornecedores, que são sobrescritas nos ciclos habituais, e a cópia diária de fotos e PDFs, que guarda o que foi apagado por 30 dias.",
        "Os registros de erros, que não estão vinculados à sua conta.",
        "O que a lei obrigar a guardar (por exemplo, dados de faturamento), pelo prazo que ela fixar.",
        "Se a sua conta tinha um perfil suspenso, o nome de usuário fica reservado para que ninguém volte a usá-lo, e o registro dessa suspensão é guardado por 3 anos.",
        "Se sua conta tem um negócio no Mycen Business, escreva para a gente: encerramos junto com você para cuidar dos dados de clientes e vendas.",
      ] },
    ] },
  ],
  terms: [
    { id: "quien", title: "Quem presta o serviço", body: [
      "O Mycen é um serviço operado por **Luca Cazzoli** (CUIT 20-42325961-3, identificação fiscal argentina), sob o nome fantasia **Resilio**, com domicílio na República Argentina. Você pode nos escrever em **team@mycen.id**.",
      "A Mycen permite criar uma identidade digital pública (Mycen Identity), administrá-la pelo Mycen Studio e organizar sua vida pessoal no Life OS. O Mycen Business, para gerenciar negócios, ainda não está aberto a novos negócios.",
      "**Ponto de contato:** para usuários e autoridades (inclusive para os fins do Regulamento dos Serviços Digitais da União Europeia), escreva para **team@mycen.id**, em espanhol ou inglês.",
    ] },
    { id: "edad", title: "Quem pode usar o Mycen", body: [
      "Para usar a Mycen você precisa ter pelo menos **13 anos**, ou a idade maior que a lei do seu país exigir para usar um serviço como este sem o consentimento da mãe, do pai ou do responsável (por exemplo, **14** na Coreia do Sul e na China, e até **16** em alguns países da União Europeia).",
      "Ao criar uma conta você confirma que tem a idade necessária. Se soubermos que uma conta é de alguém que não a tem, nós a excluímos.",
      "Para usar o Mycen Business em nome de um negócio, você precisa ser maior de idade e ter autorização para representá-lo.",
    ] },
    { id: "cuenta", title: "Sua conta", body: [
      "Você é responsável por manter sua senha segura e pelo que acontece na sua conta. Os dados que você cadastrar precisam ser verdadeiros e seus, ou você precisa ter permissão para usá-los.",
      "Se notar algum uso que não autorizou, troque sua senha e nos escreva.",
    ] },
    { id: "contenido", title: "Seu conteúdo", body: [
      "O que você publica continua sendo seu. Você nos dá uma permissão gratuita e mundial para guardá-lo, exibi-lo no seu endereço público e adaptá-lo tecnicamente (por exemplo, reduzir imagens) enquanto estiver publicado. Você pode editar, ocultar, despublicar ou excluir quando quiser.",
      "O que você publicar precisa cumprir as regras de conteúdo. Podemos ocultar ou suspender o que não cumprir.",
      "Se você publicar conteúdo ou dados de outras pessoas ou marcas (por exemplo, o contato da sua agência, uma citação da imprensa, um logo ou os números da sua audiência), precisa ter o direito de fazer isso e o que disser tem que ser verdade. Se algo for publicidade paga ou uma permuta, deixe claro, como pedem as leis de publicidade de muitos países.",
    ] },
    { id: "reglas", title: "Regras de conteúdo", body: [
      "No Mycen não é permitido publicar:",
      { list: [
        "**Spam ou publicidade enganosa:** promessas falsas, links que não levam aonde dizem ou avaliações inventadas.",
        "**Golpes ou fraude:** pedir dinheiro ou dados com enganos, vender o que não existe.",
        "**Falsificação de identidade:** fingir ser outra pessoa, empresa ou marca.",
        "**Ódio ou assédio:** atacar pessoas ou grupos pelo que são, ou assediar alguém.",
        "**Violência ou ameaças:** ameaçar, incitar a violência ou exibi-la de forma gratuita.",
        "**Conteúdo sexual explícito**, e qualquer conteúdo sexual envolvendo menores (denunciado às autoridades).",
        "**Algo ilegal:** produtos ou serviços proibidos, ou conteúdo que viole direitos de terceiros (marcas, fotos, textos).",
        "**Links maliciosos:** vírus, phishing ou sites enganosos.",
      ] },
      "Qualquer pessoa pode denunciar um perfil ou projeto pelo link \"Denunciar\" no rodapé da página, sem conta e de forma anônima. Revisamos cada denúncia. Se um perfil não cumpre as regras, nós o suspendemos: ele deixa de ser exibido (página, projetos e cartão de contato) e o dono vê o motivo no Studio. Se você acha que foi um erro, escreva-nos a partir da conta com que o criou e revisaremos de novo.",
      "Enquanto um perfil está suspenso, a conta não pode criar perfis novos nem apagá-lo para começar do zero. Se a conta for excluída, esse nome de usuário fica reservado e não pode voltar a ser usado.",
      "**Como moderamos:** combinamos ferramentas automáticas e pessoas. Por exemplo, verificamos os links publicados com o Google Web Risk e colocamos limites automáticos contra abusos, mas nenhum perfil é suspenso só por uma ferramenta automática: uma pessoa da equipe revisa cada caso. Quando ocultamos ou suspendemos algo, dizemos o quê, por quê e qual regra foi descumprida, e você pode pedir que revisemos de novo. Se você mora na União Europeia, também pode recorrer a um órgão certificado de resolução extrajudicial de litígios ou aos tribunais. Se um conteúdo mostrar perigo para a vida ou a segurança de alguém, ou abuso sexual infantil, avisamos as autoridades.",
    ] },
    { id: "uso", title: "Uso correto do serviço", body: [
      "Além das regras de conteúdo, não é permitido:",
      { list: [
        "**Automatizar** a criação de contas, visitas, votos ou mensagens, nem usar bots para inflar números.",
        "**Copiar em massa** os perfis ou os dados de outras pessoas (scraping), exceto o que os buscadores fazem com as páginas públicas.",
        "**Atacar ou testar a segurança** da Mycen sem permissão. Se encontrar uma falha, avise em team@mycen.id.",
        "**Burlar** uma suspensão, um bloqueio ou os limites do serviço, por exemplo criando outra conta.",
        "**Vender, alugar ou transferir** sua conta ou seu nome de usuário.",
      ] },
    ] },
    { id: "derechos-de-autor", title: "Direitos autorais e outros direitos", body: [
      "Se você acredita que algo publicado no Mycen infringe seus direitos autorais ou outros direitos (por exemplo, sua marca ou sua imagem), pode nos pedir que o removamos. Escreva para **team@mycen.id** com:",
      { list: [
        "**O link do conteúdo:** o endereço exato no Mycen do perfil, projeto ou imagem.",
        "**Quem é o titular** do direito e como contatá-lo. Se você age em nome de outra pessoa ou empresa, informe.",
        "**Por que infringe:** qual obra, marca ou outro direito é e como está sendo usado sem permissão.",
        "**Uma declaração:** de que você acredita de boa-fé que esse uso não é autorizado pelo titular, seu representante ou a lei e, sob pena de perjúrio, de que as informações estão corretas e de que você é o titular ou está autorizado a agir em seu nome.",
        "**Sua assinatura**, física ou eletrônica (basta seu nome completo digitado).",
      ] },
      "Analisamos cada pedido. Se for o caso, removemos ou bloqueamos o conteúdo e avisamos quem o publicou, com o motivo. Essa pessoa pode nos responder com sua versão (por exemplo, se tem permissão para usá-lo) e analisamos de novo.",
      "**Se removermos algo seu e você achar que foi um erro,** envie uma contranotificação com o link do conteúdo removido, uma declaração sob pena de perjúrio de que acredita de boa-fé que foi removido por erro ou identificação equivocada, seu nome, endereço e telefone, e sua aceitação da jurisdição dos tribunais competentes. Nós a repassamos a quem fez o pedido e, se em 10 a 14 dias úteis essa pessoa não mostrar que iniciou uma ação judicial, podemos publicá-lo de novo.",
      "Contas que publicam repetidamente conteúdo que infringe direitos de outros podem ser suspensas ou encerradas.",
    ] },
    { id: "usernames", title: "Nomes de usuário", body: [
      "Alguns nomes estão reservados. Não é permitido registrar nomes para se passar por outra pessoa ou marca, nem para revendê-los; nesses casos podemos recuperá-los. Se você mudar seu username, o endereço anterior redireciona para o novo para que seus links e QR continuem funcionando.",
      "Não é possível escolher nomes que imitem bancos, carteiras digitais, serviços ou marcas conhecidas (por exemplo, com a palavra “banco” ou o nome de uma marca): a Mycen os recusa na hora da escolha. Se a sua conta é verificada e você muda seu nome ou nome de usuário, o selo de verificada volta para revisão.",
      "A pedido de uma pessoa conhecida, uma marca ou seu representante, podemos reservar o nome de usuário antes que ela crie a conta: só essa pessoa pode usá-lo. Se você acha que alguém registrou um nome que pertence a você, escreva para nós com provas e vamos analisar.",
    ] },
    { id: "propiedad", title: "O que é da Mycen", body: [
      "A marca Mycen, a impressão (huella), o design e o software da Mycen pertencem aos seus titulares. Estas condições dão permissão para usar o serviço, não direitos sobre essas coisas. Se você nos enviar ideias ou sugestões, podemos usá-las livremente para melhorar a Mycen, sem nenhuma obrigação com você.",
    ] },
    { id: "pagos", title: "Preço", body: [
      "Hoje a Mycen é **gratuita**: sua identidade, o Studio e o Life OS não têm custo e não pedimos nenhum meio de pagamento.",
      "Se no futuro adicionarmos planos pagos (por exemplo, quando o Mycen Business abrir), vamos avisar antes, com o preço em dólares americanos (US$) mais os impostos do seu país, e nada do que você usa de graça hoje passará a ser cobrado sem o seu acordo. Não haverá permanência mínima e, se você for consumidor, mantém os direitos que a lei do seu país dá, como o de desistir de uma compra a distância.",
    ] },
    { id: "servicio", title: "O serviço", body: [
      "Trabalhamos para que o Mycen funcione sempre e bem, mas pode haver interrupções, erros ou mudanças. As funções podem mudar, melhorar ou deixar de estar disponíveis; se algo importante mudar, avisaremos com antecedência quando possível.",
      "Na medida permitida pela lei, o Mycen é oferecido \"no estado em que se encontra\", e não respondemos por danos indiretos nem por lucros cessantes decorrentes do uso do serviço. Nada disso limita os direitos que a lei do seu país não permite limitar, como os direitos de quem usa o serviço como consumidor.",
      "Os links, vídeos, músicas e serviços de terceiros que aparecem nos perfis são desses terceiros: não os controlamos nem respondemos por eles.",
      "Se mesmo assim tivermos que responder, nossa responsabilidade total fica limitada ao que você nos pagou nos 12 meses anteriores ou a US$ 100, o que for maior. Esse limite não se aplica em casos de dolo ou culpa grave, danos à vida ou à saúde, nem onde a lei não permitir limitá-la.",
    ] },
    { id: "baja", title: "Cancelamento e suspensão", body: [
      "Você pode excluir sua conta quando quiser em Studio → Configurações, e baixar antes uma cópia dos seus dados. Contas com um negócio ativo no Mycen Business são canceladas pelo suporte, porque envolvem dados de clientes e vendas.",
      "Podemos suspender ou encerrar contas que descumpram estas condições ou a lei, ou que coloquem em risco outras pessoas ou o serviço. Quando possível, avisaremos e explicaremos o motivo.",
    ] },
    { id: "apps", title: "Se você usa o app de iPhone ou de Android", body: [
      "Se você baixou a Mycen da App Store da Apple, também vale o seguinte:",
      { list: [
        "Estas condições são entre você e a Mycen, não com a Apple. A Apple não é responsável pelo app nem pelo seu conteúdo.",
        "Você pode usar o app nos dispositivos Apple que tenha ou controle, conforme as regras de uso da App Store.",
        "A Apple não tem nenhuma obrigação de oferecer manutenção ou suporte do app; para isso, escreva para team@mycen.id.",
        "Se o app não cumprir uma garantia aplicável, você pode avisar a Apple, que devolverá o que você pagou por ele (o app é gratuito); a Apple não tem nenhuma outra obrigação de garantia. As reclamações sobre o app (responsabilidade pelo produto, cumprimento da lei, proteção do consumidor ou propriedade intelectual de terceiros) são atendidas pela Mycen, não pela Apple.",
        "Você declara que não está em um país sujeito a embargo dos Estados Unidos nem consta nas listas de pessoas com proibições ou restrições desse país.",
        "A Apple e suas subsidiárias são terceiras beneficiárias destas condições e podem exigi-las de você.",
      ] },
      "Se você baixou pelo Google Play, também se aplicam as condições do Google Play.",
    ] },
    { id: "cambios", title: "Mudanças nestas condições", body: [
      "Se mudarmos estas condições de forma importante, avisaremos por e-mail ou dentro do Mycen antes que entrem em vigor. Se não concordar, você pode deixar de usar o serviço e excluir sua conta.",
    ] },
    { id: "ley", title: "Lei aplicável", body: [
      "Estas condições são regidas pelas leis da República Argentina. Se você usa o Mycen como consumidor a partir de outro país, também é protegido pelas normas do seu país que não podem ser afastadas por contrato, e pode reclamar nos tribunais do seu domicílio.",
      "**Outras condições:** se uma parte destas condições não for válida, o restante continua vigente. Não exercer um direito em algum momento não significa renunciar a ele. Não respondemos por atrasos ou falhas causados por fatos fora do nosso controle razoável. Podemos transferir estas condições se a Mycen passar a outra pessoa ou empresa (por exemplo, ao constituir uma sociedade), com aviso prévio; você não pode transferi-las sem nosso acordo. Estas condições e a política de privacidade são o acordo completo entre você e a Mycen.",
      "Antes de qualquer reclamação, escreva para **team@mycen.id**: quase tudo se resolve conversando.",
    ] },
  ],
  privacy: [
    { id: "responsable", title: "Quem é responsável pelos seus dados", body: [
      "O controlador dos dados é **Luca Cazzoli** (CUIT 20-42325961-3, identificação fiscal argentina), que opera o Mycen sob o nome fantasia **Resilio**, com domicílio na República Argentina. Para qualquer dúvida sobre seus dados, escreva para **team@mycen.id**.",
      "Quando um negócio usa o Mycen Business para gerir dados dos próprios clientes (pedidos, reservas, horários), esse negócio é o controlador desses dados e o Mycen os trata em seu nome e seguindo suas instruções.",
      "A Mycen não tem estabelecimento na União Europeia nem no Reino Unido. Para qualquer assunto de proteção de dados — inclusive para falar com o encarregado previsto na LGPD, no Brasil, ou com o responsável por reclamações previsto na lei da Índia — escreva para **team@mycen.id**.",
    ] },
    { id: "datos", title: "Quais dados usamos", body: [
      { list: [
        "**Sua conta:** nome, e-mail, senha (guardada criptografada, nunca a vemos), idioma, moeda, fuso horário e a data em que você aceitou estas condições. Se você ativar a verificação em duas etapas, também a chave do seu app autenticador (guardada criptografada pela Supabase).",
        "**Nomes reservados e impressão digital ou rosto:** se a equipe da Mycen reservou seu nome de usuário a seu pedido ou a pedido da sua agência ou representante (que nos passa esses dados se você ainda não tem conta), guardamos seu nome, seu e-mail e uma nota enquanto durar a reserva, só para que ninguém mais o use. Se você entra com a impressão digital ou o rosto, isso nunca sai do seu dispositivo: a Mycen (com o Supabase) guarda só uma chave pública.",
        "**Portfólio (medidas, audiência, marcas, imprensa, créditos e representação):** são dados que você mesmo preenche, opcionais, e aparecem no seu perfil público só se você os completar e o módulo estiver visível. A Mycen não os verifica nem os calcula: os números de audiência levam a data que você colocou e deixam de aparecer depois de um ano. Você pode mudá-los ou ocultá-los quando quiser.",
        "**Seu perfil público:** o que você coloca no Studio (nome, foto, textos, links, projetos, cartão de contato). Só é publicado o que você decide mostrar. Cada foto é gerada de novo no seu dispositivo antes do envio, então os dados ocultos que ela traz (como a localização GPS ou o modelo da câmera) são apagados.",
        "**Life OS:** suas metas, hábitos, tarefas, finanças e notas, incluindo os nomes que você escrever (por exemplo, com quem dividiu um gasto). São privados: só você pode vê-los. Seu diário também: o bloqueio com PIN, digital ou rosto funciona só no seu dispositivo (não vai para a Mycen) e as entradas não têm criptografia de ponta a ponta.",
        "**Como você se sentiu:** se ao fechar o dia você tocar em uma das carinhas, guardamos esse dado (de 1 a 5) e a data. Ele pode dizer algo sobre a sua saúde: por isso é opcional, só você vê e só o usamos para mostrar seus próprios padrões (por exemplo, em Insights e em “Seu mês”). Tocar a carinha é o seu consentimento, e você o retira tocando de novo (é apagado) ou apagando o Life OS.",
        "**Mycen Business:** os dados do seu negócio e o que você cadastrar sobre seus clientes e vendas.",
        "**Estatísticas de visitas:** eventos pseudonimizados (visitas e toques no seu perfil): em vez de saber quem é cada visitante, usamos um identificador que muda todos os dias e não pode ser revertido. Não guardamos endereços IP nem dados do dispositivo, e não contamos robôs. Também guardamos de qual site ou link veio a visita (por exemplo, Instagram ou o QR).",
        "**Denúncias:** o motivo e o detalhe que quem denuncia escreve, com um identificador pseudonimizado que muda todos os dias, para evitar abusos. Se quem denuncia estiver com a sessão iniciada, guardamos também a conta: só a equipe da Mycen vê, nunca a pessoa denunciada.",
        "**Mensagens do formulário de contato:** o nome, o contato (e-mail ou WhatsApp) e a mensagem que um visitante deixa. Se o perfil tiver o módulo Colaborações, uma marca deixa também a empresa e o que procura e, se quiser, o site, um orçamento e um prazo. Só a pessoa dona do perfil vê, no Studio; não são publicadas nem enviadas por e-mail. Para evitar abusos usamos um identificador pseudonimizado que muda todos os dias, sem IP nem dados do dispositivo. Se a pessoa dona denunciar uma mensagem, guardamos uma cópia para a equipe da Mycen revisar. Se bloquear um contato (ou denunciá-lo), guardamos esse e-mail ou telefone no perfil para descartar o que ele voltar a enviar.",
        "**Inscrições:** se você se inscrever pelo módulo “Inscrever-se” de um perfil, guardamos seu e-mail (e seu nome, se o perfil pedir), a data em que você deu o consentimento e seu idioma, e os entregamos à pessoa dona desse perfil, que os vê no Studio e pode exportá-los. A Mycen não envia nada para essa lista: a pessoa dona do perfil decide como usá-la e é responsável por fazer isso direito. Para sair, peça a essa pessoa ou escreva para team@mycen.id e apagamos. Para evitar abusos usamos um identificador pseudonimizado que muda todos os dias, sem IP nem dados do dispositivo.",
        "**Enquetes:** se você votar na enquete de um perfil, guardamos sua opção com um identificador pseudonimizado que muda todos os dias (sem IP, sem conta e sem dados do dispositivo), para contar um voto por pessoa. A pessoa dona vê só os totais. Seu navegador lembra em que você votou, para mostrar isso a você.",
        "**Convites:** se você criar sua conta a partir de “Crie sua identidade” no perfil de outra pessoa, guardamos qual perfil trouxe você e o tipo dele, para entender como o Mycen cresce. Essa pessoa não vê seus dados.",
        "**Uso do app:** para saber se o Mycen funciona e como está crescendo, guardamos eventos de uso (por exemplo, que você publicou seu perfil, abriu “Meu dia” ou marcou um hábito) com sua conta, a data e dados curtos como a estrutura escolhida ou um número de dias. Além disso, uma vez por dia anotamos que você usou o Mycen, de que tipo de dispositivo (navegador, app instalado, iPhone ou Android), em que idioma e o fuso horário do dispositivo (por exemplo, “America/Argentina/Buenos_Aires”); nunca seu IP nem sua localização exata. Nunca guardamos o conteúdo das suas tarefas, hábitos, notas ou mensagens. Não usamos serviços de análise de terceiros.",
        "**Verificação da conta:** se você pedir o selo de conta verificada, guardamos sua mensagem, o link que você nos passar e a resposta. Só a equipe Mycen vê esses dados, para revisar o pedido; se for aprovado, seu perfil mostra o selo.",
        "**Erros técnicos:** quando algo falha, guardamos a mensagem de erro, a tela, a versão do Mycen e o navegador (por exemplo, \"Chrome 128 · Android\"), sem IP nem dados pessoais, para poder corrigir.",
        "**Avisos com o app fechado (web):** se você permitir os avisos do Life OS no navegador, guardamos o endereço de envio que o navegador cria, suas chaves de criptografia, o fuso horário e o nome do navegador (por exemplo, “Chrome · Android”), para enviar seus lembretes. É apagado quando você desativa os avisos, quando o navegador cancela a inscrição ou ao excluir sua conta.",
        "**Proteção contra abusos:** para frear ataques, contamos quantos pedidos chegam de cada conexão às funções públicas (visitas, mensagens, votos, denúncias). Não guardamos o endereço IP: o transformamos em um código que não pode ser revertido (um hash com uma chave secreta) e o apagamos após 2 dias.",
        "**O que a equipe da Mycen faz:** quando a equipe suspende um perfil, resolve uma denúncia, verifica uma conta ou apaga arquivos, fica registrado quem fez, quando e em qual conta, para poder prestar contas. Esse registro não pode ser modificado e é guardado por 3 anos.",
      ] },
    ] },
    { id: "para-que", title: "Para que os usamos e com que base", body: [
      { list: [
        "**Prestar o serviço** que você pediu ao criar sua conta: guardar, exibir e sincronizar suas informações (execução do contrato).",
        "**Guardar como você se sentiu** (as carinhas do Life OS), só se você registrar: com o seu consentimento explícito, que você retira quando quiser apagando.",
        "**Enviar avisos com o app fechado**, só se você permitir no navegador ou no celular (consentimento; você o retira desativando-os).",
        "**Manter o Mycen seguro e funcionando:** prevenir abusos, revisar denúncias e corrigir erros (legítimo interesse).",
        "**Mostrar estatísticas** do seu perfil, com dados pseudonimizados (interesse legítimo).",
        "**Enviar e-mails necessários** sobre sua conta: confirmação, recuperação de senha e mudanças importantes (execução do contrato).",
        "**Evitar a falsificação de identidade:** revisar pedidos de verificação e reservar nomes de pessoas conhecidas a pedido delas (legítimo interesse).",
        "**Entender como a Mycen é usada e como cresce** (uso do app e convites), sem publicidade nem terceiros (legítimo interesse).",
        "**Prestar contas e conservar provas** quando a lei exige, por exemplo o registro do que a equipe faz ou uma denúncia de abuso sexual infantil (obrigação legal e legítimo interesse).",
        "**Cumprir a lei** quando uma autoridade competente exigir.",
      ] },
      "Quando a base é o legítimo interesse, você pode se opor escrevendo para nós e paramos, salvo se houver motivos legítimos mais fortes ou for necessário para uma reclamação judicial. Não tomamos decisões automatizadas com efeitos jurídicos ou igualmente importantes sobre você: quando uma ferramenta marca algo (por exemplo, um link perigoso), uma pessoa revisa.",
      "Não vendemos seus dados, não os usamos para publicidade e não há rastreadores de terceiros no Mycen.",
    ] },
    { id: "publico", title: "O que é público", body: [
      "Sua página pública mostra só o que você publica. Módulos ocultos, rascunhos e Spaces não publicados não aparecem. Perfis públicos podem aparecer em buscadores; se você escolher a visibilidade \"não listado\" ou \"privado\", eles não entram no mapa do site que os buscadores leem.",
    ] },
    { id: "proveedores", title: "Com quem compartilhamos", body: [
      "Usamos fornecedores que tratam dados apenas para prestar o serviço e sob contrato:",
      { list: [
        "**Supabase:** banco de dados, login e arquivos.",
        "**Vercel:** hospedagem do aplicativo e entrega das páginas.",
        "**Resend:** envio dos e-mails da sua conta.",
        "**Cloudflare (Turnstile):** a verificação anti-bots do cadastro, do login e da recuperação de senha. Ao abrir essas telas, a Cloudflare recebe dados técnicos do seu navegador (como o endereço IP) só para verificar que você não é um bot.",
        "**Cloudflare R2:** guarda uma cópia de segurança diária das fotos e dos PDFs que os perfis enviam, para poder recuperá-los se algo falhar. O que é apagado na Mycen fica nessa cópia por 30 dias e depois é eliminado.",
        "**Google Web Risk:** verificamos com o Google os links públicos dos perfis e projetos publicados, para encontrar golpes e vírus. Só o link é enviado; nada seu nem de quem visita. Se um link for perigoso, a equipe da Mycen o revisa.",
        "**YouTube, Vimeo, TikTok, Spotify e SoundCloud:** só se um perfil integrar um vídeo ou uma música e você tocar em \"Reproduzir\". Antes disso não nos conectamos a eles; a partir daí valem as políticas deles. Se um perfil mostra o seu \"Último vídeo\", o servidor do Mycen consulta a lista pública de vídeos do canal do YouTube escolhido pelo dono, sem enviar nenhum dado seu. Quando o dono de um perfil cola um desses links no Studio, o servidor do Mycen busca a capa pública desse vídeo ou dessa música e a guarda como mais uma foto do perfil: assim a página a mostra sem conectar você ao provedor. Se um perfil mostra um podcast, o servidor do Mycen lê o feed RSS público escolhido pelo dono, sem enviar nenhum dado seu; ao tocar em \"Ouvir\", o seu navegador se conecta ao serviço que hospeda esse podcast e valem as políticas dele. Se um perfil tem várias unidades e você toca em \"Ver a mais próxima\", o navegador pede permissão para usar sua localização: ela é usada só no seu dispositivo para ordenar a lista e não é enviada ao Mycen nem a ninguém.",
        "**Anthropic:** só se um negócio usa a importação do cardápio a partir de um PDF; esse arquivo é processado.",
        "**Mercado Pago:** só se um negócio o configura para receber pagamentos; o pagamento é feito no Mercado Pago.",
        "**Google (login):** só se você escolher \"Continuar com o Google\". O Google nos confirma seu nome, seu email e sua foto; não recebemos sua senha do Google nem acessamos mais nada da sua conta.",
        "**Apple (login):** só se você escolher \"Continuar com a Apple\". A Apple nos confirma seu nome e seu email (ou um email de encaminhamento que a Apple cria se você preferir ocultar o seu); não recebemos sua senha nem acessamos mais nada da sua conta.",
        "**App de iOS e Android:** se você baixar, a Apple (App Store) ou o Google (Google Play) registram o download segundo as próprias políticas. No app, os lembretes são programados no seu celular, sem um serviço de notificações de terceiros.",
        "**Serviço de avisos do seu navegador:** só se você permitir os avisos do Life OS na web. O lembrete (o nome da tarefa ou do hábito e o horário) viaja criptografado até o seu dispositivo pelo serviço de avisos do navegador: Google (Firebase Cloud Messaging) no Chrome e no Android, Microsoft no Edge, Apple no Safari e Mozilla no Firefox. Esse serviço vê o endereço de envio, mas não consegue ler o conteúdo.",
        "**Google Agenda, Apple ou outra agenda:** só se você ativar o link de agenda do Life OS; esse serviço baixa suas tarefas pendentes com data (título, data, horário e lembrete). Você pode desativar ou trocar quando quiser.",
        "**Reconhecimento de voz do seu navegador:** só se você usar \"Ditar\" no Life OS. Seu navegador converte a voz em texto (no Chrome, quem faz isso é o serviço de voz do Google; no Safari, a Apple). O Mycen recebe só o texto.",
      ] },
      "Fora isso, só compartilhamos dados se a lei exigir ou para proteger os direitos e a segurança das pessoas.",
    ] },
    { id: "transferencias", title: "Dados fora do seu país", body: [
      "A Mycen é operada a partir da Argentina, país que a Comissão Europeia reconhece com nível de proteção adequado. Nossos fornecedores podem guardar ou processar dados em outros países, como os Estados Unidos ou países da União Europeia. Nesses casos usamos as garantias previstas em lei: decisões de adequação (por exemplo, o Quadro de Privacidade de Dados UE-EUA para os fornecedores aderentes), as cláusulas contratuais-padrão da Comissão Europeia e do Reino Unido, e as cláusulas-modelo da autoridade argentina (AAIP). Você pode nos pedir mais informações ou uma cópia dessas garantias.",
    ] },
    { id: "plazos", title: "Por quanto tempo os guardamos", body: [
      { list: [
        "Os dados da sua conta, do seu perfil e do Life OS, enquanto você tiver a conta. Se você a excluir, os apagamos, inclusive suas fotos e PDFs; as cópias de segurança dos fornecedores são sobrescritas nos ciclos habituais e a cópia diária de fotos e PDFs guarda o que foi apagado por 30 dias.",
        "As estatísticas de visitas são guardadas pseudonimizadas (com o identificador que muda todo dia) por 13 meses —o Studio mostra até 90 dias— e os votos das enquetes, enquanto o perfil existir. Se o perfil for apagado, são apagados junto.",
        "As mensagens do formulário de contato, até que a pessoa dona do perfil as apague ou exclua a conta.",
        "Os e-mails de inscrição, até que a pessoa dona do perfil os apague, exclua a conta ou você nos peça para apagá-los.",
        "Os registros de erros são guardados enquanto servirem para corrigi-los (um resolvido continua guardado caso volte a acontecer); a contagem de pessoas afetadas, 90 dias.",
        "Os eventos de uso do app e o registro dos dias em que você usou o Mycen, 25 meses (depois são apagados automaticamente); se você excluir sua conta antes, eles deixam de ter qualquer vínculo com você.",
        "Os avisos do navegador, até você desativá-los ou excluir a conta; o código de conexão para frear abusos, 2 dias; os contatos bloqueados, até a pessoa dona desbloqueá-los ou apagar o perfil; e o registro do que a equipe da Mycen faz, 3 anos.",
        "As denúncias, enquanto existir o perfil denunciado (são apagadas com ele); os pedidos de verificação e os convites, enquanto existir a conta; os nomes reservados, enquanto durar a reserva; e os links marcados como perigosos, 13 meses.",
        "O que a lei obrigar a conservar (por exemplo, dados de faturamento ou as provas que uma autoridade pede em caso de abuso sexual infantil), pelo prazo que fixar, bloqueado para qualquer outro uso e mesmo que se peça a exclusão.",
      ] },
    ] },
    { id: "dispositivo", title: "O que fica no seu dispositivo", body: [
      "O Mycen não usa cookies de publicidade nem de rastreamento. No seu navegador guardamos só o necessário para funcionar: sua sessão, seu idioma e alguns rascunhos e preferências. Você pode apagar isso nas configurações do navegador (vai precisar entrar de novo). Se você registrar algo no Life OS sem conexão, isso fica no seu dispositivo até ser enviado (só com a sua sessão). Do PIN do diário guardamos só uma impressão cifrada (hash), nunca o PIN. Por isso não mostramos um aviso de cookies: usamos só o estritamente necessário, que a lei permite sem pedir consentimento.",
    ] },
    { id: "seguridad", title: "Segurança", body: [
      "Usamos conexões criptografadas, senhas guardadas com criptografia, verificação em duas etapas para a equipe e permissões no banco de dados para que cada pessoa veja só o que é seu. Nenhum sistema é perfeito: se um vazamento puder afetar seus direitos, avisamos a autoridade competente (na União Europeia, em até 72 horas) e, se o risco for alto, também você, sem demora.",
    ] },
    { id: "derechos", title: "Seus direitos", body: [
      "Você pode pedir acesso aos seus dados, corrigi-los, apagá-los, levá-los com você (portabilidade), se opor ou limitar certos usos, e retirar um consentimento que tenha dado, sem afetar o que foi feito antes. Muita coisa você faz direto em Studio → Ajustes (baixar seus dados, excluir sua conta) ou em Life OS → Ajustes → Seus dados. Para o resto, escreva para **team@mycen.id**; para proteger sua conta, podemos pedir que confirme que é você (por exemplo, escrevendo do e-mail da conta). É gratuito.",
      "Respondemos dentro dos prazos legais (na Argentina, 10 dias corridos para o acesso e 5 dias úteis para corrigir ou apagar). Você também pode reclamar à autoridade de proteção de dados: na Argentina, a **Agencia de Acceso a la Información Pública (AAIP)**; na União Europeia, a autoridade do seu país; no Brasil, a **ANPD**.",
    ] },
    { id: "segun-pais", title: "Conforme onde você mora", body: [
      "Além do que foi dito acima:",
      { list: [
        "**União Europeia, Espaço Econômico Europeu, Reino Unido e Suíça:** respondemos em um mês (mais dois se o pedido for complexo, e avisamos). Você pode reclamar à autoridade de proteção de dados do seu país.",
        "**Brasil (LGPD):** você também pode pedir para saber com quais empresas compartilhamos seus dados e a revisão de uma decisão automatizada. Autoridade: a **ANPD**.",
        "**Estados Unidos (Califórnia e os estados com leis de privacidade, como Virgínia, Colorado, Connecticut ou Texas):** você pode saber quais dados temos — identificadores como seu nome e e-mail, o que você publica, dados de uso do app e, só se você registrar, como se sentiu, um dado sensível que usamos apenas para mostrar a você —, pedir que os corrijamos ou apaguemos e levá-los com você. Não vendemos nem compartilhamos seus dados para publicidade, então não é preciso descadastrar-se de nada; mesmo assim respeitamos o sinal Global Privacy Control. Você pode agir por meio de um representante autorizado e não vamos tratá-lo de forma diferente por exercer seus direitos. Se recusarmos um pedido, você pode recorrer respondendo com o assunto “Recurso” e, se continuar em desacordo, reclamar ao procurador-geral do seu estado.",
        "**Canadá, Austrália, Japão e Coreia do Sul:** você pode acessar seus dados, corrigi-los e retirar seu consentimento. Pode reclamar ao Comissário de Privacidade do Canadá, ao OAIC da Austrália, à PPC do Japão ou à PIPC da Coreia.",
        "**Índia (DPDP):** você pode acessar, corrigir e apagar seus dados, e indicar alguém para exercer seus direitos se não puder fazê-lo. As reclamações são apresentadas primeiro a nós (team@mycen.id) e depois ao Conselho de Proteção de Dados da Índia.",
        "**Coreia do Sul e China continental:** como o Mycen não tem servidores lá, ao se cadastrar pedimos um consentimento separado para armazenar e processar seus dados fora do país, com o detalhe de quais dados saem, para quais fornecedores e países (os de «Dados fora do seu país»), para quê e por quanto tempo. Você pode retirá-lo quando quiser excluindo sua conta. Na Coreia, você pode reclamar à PIPC e, na China, à Administração do Ciberespaço (CAC).",
        "**Outros países:** garantimos os direitos que a lei do seu país reconhecer; escreva para nós e ajudamos.",
      ] },
    ] },
    { id: "menores", title: "Menores", body: [
      "A Mycen não é dirigida a menores de 13 anos, nem a quem não tenha a idade maior que a lei do seu país exigir para usar um serviço assim sem o consentimento dos pais (por exemplo, 14 na Coreia do Sul e na China, e até 16 em alguns países da União Europeia). Não coletamos conscientemente dados de pessoas abaixo dessa idade: se soubermos que uma conta é de alguém que não a tem, a excluímos junto com seus dados. Se você é mãe, pai ou responsável e acha que isso aconteceu, escreva para **team@mycen.id**.",
      "Se você tem menos de 18 anos, lembre que qualquer pessoa pode ver seu perfil público: não publique seu endereço, sua escola nem dados que permitam localizar você. Em Ajustes você pode escolher “Só com o link” ou “Privado”.",
    ] },
    { id: "cambios", title: "Mudanças nesta política", body: [
      "Se mudarmos esta política de forma importante, avisaremos por e-mail ou dentro do Mycen antes que seja aplicada. No topo você sempre verá a data da última atualização.",
    ] },
  ],
}

export default pt
