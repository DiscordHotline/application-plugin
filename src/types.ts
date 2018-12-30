const Types = {
    application: {
        config:   Symbol('application.config'),
        listener: {
            approval: Symbol('application.listener.approval'),
            vote:     Symbol('application.listener.vote'),
        },
        service:  {
            application: Symbol('application.service.application'),
        },
    },
};

export interface restUser {
    id           : string,
    username     : string,
    discriminator: string,
    avatar       : string
}

export default Types;
