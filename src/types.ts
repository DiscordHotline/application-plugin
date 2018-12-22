const Types = {
    application: {
        config:   Symbol('application.config'),
        listener: {
            approval: Symbol('application.listener.approval'),
            vote:     Symbol('application.listener.vote'),
        },
    },
};

export default Types;
