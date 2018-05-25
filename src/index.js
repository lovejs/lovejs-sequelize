const { Plugin } = require("@lovejs/framework");
const {
    di: {
        Definitions: { Arguments, Call, Factory, Service, Tag },
        helpers: { _service }
    }
} = require("@lovejs/components");

class SequelizePlugin extends Plugin {
    async registerServices(container, name, isCli) {
        container.setParameter("sequelize.databases", this.get("databases"));
        await container.loadDefinitions(__dirname + "/_framework/services/services.yml", name);
        if (this.get("graphql")) {
            await container.loadDefinitions(__dirname + "/_framework/services/graphql.yml");
        }
    }

    async afterContainerCompilation(container) {
        let logger = this.get("logger");
        if (!logger) {
            logger = container.hasService("logger.sequelize") ? "logger.sequelize" : "logger.default";
        }
        container.setParameter("sequelize.logger", logger);

        for (let database in this.get("databases")) {
            const dbService = new Service();
            const dbServiceName = `sequelize.db.${database}`;
            dbService.setFactory(new Factory("sequelize.registry", "getDatabase"));
            dbService.setArgs([database]);
            container.setService(dbServiceName, dbService);

            if (database === "default") {
                container.setServiceAlias("sequelize.db", "sequelize.db.default");
            }
        }

        const modelsDefinitions = container.getServicesTags("sequelize.model.definition");
        const registry = container.getService("sequelize.registry");

        modelsDefinitions.map(({ id, tag }) => {
            const { model, database, service } = tag.getData();
            const modelService = new Service(new Factory("sequelize.registry", "registerModel"));
            modelService.setArgs([database || "default", model, _service(id)]);
            modelService.addTag(new Tag("sequelize.model", { model, database }));

            if (service) {
                container.setService(service, modelService);
            }
        });
    }

    async boot(container) {
        const registry = await container.get("sequelize.registry");
        registry.setupAssociations();
    }
}

const schema = {
    type: "object",
    properties: {
        databases: { type: "object" }
    }
};

module.exports = SequelizePlugin;
