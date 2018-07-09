const SequelizeDatabase = require("./db");
const {
    di: {
        helpers: { _service }
    }
} = require("@lovejs/components");

class SequelizeRegistry {
    constructor(Sequelize, databases, logger) {
        this.Sequelize = Sequelize;
        this.databases = {};
        this.logger = logger;
        for (let name in databases) {
            this.registerDatabase(name, databases[name]);
        }
    }

    getLibrary() {
        return Sequelize;
    }

    getDatabase(name) {
        const db = this.databases[name];
        if (!db) {
            throw new Error(`Sequelize database ${name} not found`);
        }

        return db;
    }

    getDatabases() {
        return this.databases;
    }

    registerDatabase(name, settings) {
        let args = [];
        let connection = {};
        let models = {};

        if (typeof settings === "string") {
            args.push(settings);
        } else {
            let { database, username, password } = settings;
            args = [database, username, password];
            connection = settings.connection || {};
            models = settings.models || {};
        }

        connection.logging = e => {
            if (e instanceof Error) {
                this.logger.log({ database: name, message: e.message, level: "error" });
            } else {
                this.logger.log({ database: name, message: e });
            }
        };

        args.push(connection);
        this.databases[name] = new SequelizeDatabase(name, new this.Sequelize(...args), models);
    }

    registerModel(database, name, definition) {
        return this.getDatabase(database).registerModel(name, definition);
    }

    setupAssociations() {
        for (let db in this.databases) {
            this.databases[db].setupAssociations();
        }
    }
}

module.exports = SequelizeRegistry;
