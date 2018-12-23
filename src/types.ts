const Types = {
    application: {
        config:   Symbol('application.config'),
        listener: {
            approval: Symbol('application.listener.approval'),
        },
        service:  {
            application: Symbol('application.service.application'),
        },
    },
};

export default Types;
