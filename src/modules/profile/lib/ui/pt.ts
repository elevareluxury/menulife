import type { UiStrings } from '../profileI18n'

// Textos de la página pública en pt (se bajan sólo cuando alguien usa este idioma; ver ui() en profileI18n.ts)
const ui: UiStrings = {
    openNow: 'Aberto agora', closedNow: 'Fechado agora', share: 'Compartilhar', linkCopied: 'Link copiado',
    saveContact: 'Salvar contato', contact: 'Contato', location: 'Localização', howToGet: 'Como chegar',
    hours: 'Horários', closed: 'Fechado', gallery: 'Galeria', reviews: 'Avaliações', seeOnGoogle: 'Ver no Google',
    reviewsCount: 'avaliações',
    notFoundTitle: 'Este perfil não existe', notFoundText: 'Confira o link ou crie sua própria identidade no Mycen.',
    unavailableTitle: 'Este perfil não está disponível', unavailableText: 'O dono ainda não o publicou ou o pausou por enquanto.',
    errorTitle: 'Não conseguimos carregar o perfil', errorText: 'Verifique sua conexão e tente novamente.',
    retry: 'Tentar novamente', createYours: 'Crie seu Mycen', draftBanner: 'Prévia: este perfil ainda não é público.',
    footer: 'Uma identidade Mycen',
    verified: 'Conta verificada', available: 'Disponível', moreAboutMe: 'Mais sobre mim', createIdentity: 'Crie sua identidade', createFree: 'Crie seu Mycen grátis', call: 'Ligar', copyLink: 'Copiar link', qrCode: 'Código QR', moreOptions: 'Mais opções', backToTop: 'Voltar ao topo', votesCount: "{n} votos", oneVote: "1 voto", noVotes: "Ainda não há votos: o seu é o primeiro", yourVote: "Seu voto", download: "Baixar", copyCode: "Copiar código", codeCopied: "Código copiado", validUntil: "Válido até {date}", useCoupon: "Usar o cupom", listen: "Ouvir", pause: "Pausar", videos: "Vídeos", podcast: "Podcast", episodes: "Episódios", emailLabel: 'E-mail', playOn: 'Reproduzir no {provider}',
    days: { monday: 'Seg', tuesday: 'Ter', wednesday: 'Qua', thursday: 'Qui', friday: 'Sex', saturday: 'Sáb', sunday: 'Dom' },
    languageLabel: 'Idioma', socials: 'Redes sociais', close: 'Fechar', prevPhoto: 'Foto anterior', nextPhoto: 'Próxima foto', cards: 'Cartões',
    swipeHint: 'deslize para ver mais', tickets: 'Ingressos', tags: 'Categorias',
    projects: "Projetos", viewProject: "Ver projeto", credits: "Créditos", backToProfile: "Voltar ao perfil", projectNotFoundTitle: "Este projeto não existe", projectNotFoundText: "Confira o link ou veja o perfil completo.", projectUnavailableTitle: "Este projeto não está disponível", projectUnavailableText: "O dono ainda não o publicou ou o despublicou.", projectDraftBanner: "Prévia: este projeto ainda não é público.", video: "Vídeo",
    links: 'Links',
    report: 'Denunciar', reportTitle: 'Denunciar este perfil', reportProjectTitle: 'Denunciar este projeto', reportIntro: 'Conte o que está acontecendo. A equipe do Mycen revisa; o dono não sabe quem denunciou.', reportReason: 'Motivo', reportDetails: 'Detalhes (opcional)', reportSend: 'Enviar denúncia', reportSending: 'Enviando…', reportThanks: 'Obrigado. Recebemos sua denúncia e vamos analisá-la.', reportDuplicate: 'Já recebemos sua denúncia sobre este perfil. Estamos analisando.', reportLimit: 'Você enviou muitas denúncias hoje. Tente amanhã.', reportError: 'Não conseguimos enviar a denúncia. Verifique a conexão e tente de novo.', cancel: 'Cancelar', rules: 'Regras de conteúdo',
    reportReasons: { spam: 'Spam ou publicidade enganosa', scam: 'Golpe ou fraude', impersonation: 'Finge ser outra pessoa ou marca', hate: 'Ódio ou assédio', violence: 'Violência ou ameaças', sexual: 'Conteúdo sexual', illegal: 'Algo ilegal', other: 'Outro motivo' },
}

export default ui
