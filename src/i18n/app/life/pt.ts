import type { LifeDict } from './es'

const pt: LifeDict = {
  common: {
    cancel: 'Cancelar', confirm: 'Confirmar', save: 'Salvar', saving: 'Salvando…', edit: 'Editar', delete: 'Excluir',
    close: 'Fechar', search: 'Buscar', saveError: 'Não foi possível salvar. Verifique sua conexão e tente novamente.', saved: 'Salvo',
  },
  nav: { life: 'Início', money: 'Dinheiro', goals: 'Metas', habits: 'Hábitos', brain: 'Brain', settings: 'Ajustes' },
  capture: { open: 'Capturar', close: 'Fechar', idea: 'Ideia', note: 'Nota', task: 'Tarefa', goal: 'Meta', transaction: 'Movimentação' },
  home: {
    greetMorning: 'Bom dia', greetAfternoon: 'Boa tarde', greetEvening: 'Boa noite',
    myBusiness: 'Meu negócio', identityTitle: 'Minha identidade', identitySubtitle: 'Sua identidade digital, tudo em um só lugar',
    openStudio: 'Abrir Studio', viewProfile: 'Ver perfil', today: 'Hoje',
    goalsValue: n => `${n} em andamento`, habitsValue: (d, t) => `${d}/${t} hoje`, tasksValue: n => `${n} pendentes`,
    recap: '✦ Ver resumo do mês', settings: 'Ajustes', language: 'Idioma',
  },
  settings: {
    title: 'Ajustes', subtitle: 'Idioma, moeda e região da sua conta.',
    language: 'Idioma', languageHelp: 'Usado no Life OS, no Studio e no seu perfil.',
    currency: 'Moeda principal', currencyHelp: 'Seus totais de Dinheiro aparecem nesta moeda.',
    extraCurrencies: 'Outras moedas',
    extraHelp: 'Para registrar movimentações em outras moedas (até 5). São somadas separadamente: não convertemos valores.',
    addCurrency: 'Adicionar moeda', removeCurrency: c => `Remover ${c}`, searchCurrency: 'Buscar moeda…',
    timezone: 'Fuso horário', timezoneHelp: 'Define quando seu dia começa e termina.',
    weekStart: 'A semana começa na', monday: 'Segunda-feira', sunday: 'Domingo',
    account: 'Conta', openStudio: 'Abrir Mycen Studio', signOut: 'Sair', savedOk: 'Ajustes salvos', noResults: 'Sem resultados',
  },
  money: {
    title: 'Dinheiro', add: 'Nova movimentação', balance: m => `Saldo de ${m}`, otherCurrencies: 'Outras moedas neste mês',
    income: 'Receitas', expense: 'Despesas', today: 'Hoje', yesterday: 'Ontem', net: 'líquido',
    emptyTitle: 'Seu dinheiro, visível', emptyText: 'Registre receitas e despesas para ver para onde vai seu dinheiro.',
    emptyAction: 'Adicionar primeira movimentação', options: 'Opções', deleteTitle: 'Excluir movimentação?',
    deleteText: (k, a, c) => `${k} de ${a} em ${c}.`, incomeOne: 'Receita', expenseOne: 'Despesa',
  },
  tx: {
    newTitle: 'Nova movimentação', editTitle: 'Editar movimentação', income: 'Receita', expense: 'Despesa', amount: 'Valor',
    currency: 'Moeda', category: 'Categoria', description: 'Descrição (opcional)', descriptionPlaceholder: 'Para que foi?',
    date: 'Data', invalidAmount: 'Digite um valor válido', create: 'Registrar movimentação', update: 'Salvar alterações',
  },
  categories: {
    Sueldo: 'Salário', Freelance: 'Freelance', Comisiones: 'Comissões', Ventas: 'Vendas', Inversiones: 'Investimentos',
    Vivienda: 'Moradia', Transporte: 'Transporte', Comida: 'Alimentação', Ocio: 'Lazer', Salud: 'Saúde',
    Suscripciones: 'Assinaturas', Ropa: 'Roupas', Otros: 'Outros',
  },
}
export default pt
