declare const es: {
    meta: {
        title: string;
        description: string;
    };
    nav: {
        product: string;
        pricing: string;
        login: string;
        cta: string;
        language: string;
        menu: string;
    };
    hero: {
        line1: string;
        line2: string;
        subtitle: string;
        cta: string;
        how: string;
        cardTitle: string;
        cardText: string;
        badgePublished: string;
        badgeUrl: string;
        badgeGoal: string;
        badgeGoalSub: string;
    };
    /** Ejemplo ilustrativo dentro del teléfono del hero (no es una persona real) */
    phone: {
        name: string;
        descriptor: string;
        status: string;
        links: {
            label: string;
            sub: string;
        }[];
        powered: string;
    };
    marquee: {
        label: string;
    };
    problem: {
        label: string;
        title: string;
        titleAccent: string;
        subtitle: string;
        items: {
            social: string;
            goals: string;
            notes: string;
            clients: string;
            business: string;
            money: string;
        };
        disconnected: string;
    };
    solution: {
        label: string;
        title: string;
        titleAccent: string;
        subtitle: string;
        identity: string;
        identitySub: string;
        organization: string;
        organizationSub: string;
        business: string;
        businessSub: string;
    };
    life: {
        label: string;
        title: string;
        titleAccent: string;
        subtitle: string;
        identity: string;
        identityCopy: string;
        money: string;
        moneyCopy: string;
        goals: string;
        goalsCopy: string;
        habits: string;
        habitsCopy: string;
        brain: string;
        brainCopy: string;
        cta: string;
    };
    /** V1 · etapa 13: las cinco estructuras del perfil (imágenes de ejemplo) y "Mi día" */
    structures: {
        label: string;
        title: string;
        titleAccent: string;
        subtitle: string;
        themes: string;
        universo: string;
        amanecer: string;
        layouts: {
            credencial: {
                name: string;
                text: string;
            };
            portada: {
                name: string;
                text: string;
            };
            editorial: {
                name: string;
                text: string;
            };
            bento: {
                name: string;
                text: string;
            };
            clasica: {
                name: string;
                text: string;
            };
        };
        alt: (name: string, theme: string) => string;
    };
    myDay: {
        title: string;
        text: string;
        points: string[];
        alt: string;
    };
    business: {
        label: string;
        title: string;
        titleAccent: string;
        food: {
            tag: string;
            title: string;
            features: string[];
            cta: string;
        };
        retail: {
            tag: string;
            title: string;
            features: string[];
            cta: string;
        };
        services: {
            tag: string;
            title: string;
            features: string[];
            cta: string;
        };
    };
    testimonials: {
        label: string;
        title: string;
        titleAccent: string;
    };
    pricing: {
        label: string;
        title: string;
        titleAccent: string;
        freeNote: string;
        monthly: string;
        sixMonths: string;
        annual: string;
        perMonth: string;
        noteSixMonths: string;
        noteAnnual: string;
        trustLine: string;
        plan1: {
            tag: string;
            name: string;
            desc: string;
            badge: string;
            badgeNote: string;
            features: string[];
            cta: string;
        };
        plan2: {
            tag: string;
            name: string;
            desc: string;
            features: string[];
            cta: string;
            note: string;
        };
        custom: {
            name: string;
            desc: string;
            cta: string;
        };
    };
    vision: {
        label: string;
        title: string;
        titleAccent: string;
        body: string;
    };
    cta: {
        label: string;
        title: string;
        subtitle: string;
        primary: string;
        secondary: string;
    };
    faq: {
        label: string;
        title: string;
        titleAccent: string;
        items: {
            q: string;
            a: string;
        }[];
    };
    footer: {
        product: string;
        pricing: string;
        faq: string;
        contact: string;
        terms: string;
        privacy: string;
        madeBy: string;
    };
};
export type LandingDict = typeof es;
export default es;
