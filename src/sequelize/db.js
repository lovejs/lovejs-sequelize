const _ = require("lodash");

class SequelizeDb {
    constructor(name, instance, modelsOptions = {}) {
        this.name = name;
        this.instance = instance;
        this.models = {};
        this.definitions = {};
        this.modelsOptions = modelsOptions;
    }

    registerModel(name, definition) {
        this.definitions[name] = definition;
        const { schema, options, onDefine, ...metas } = definition;
        const modelOptions = _.defaults(options || {}, this.modelsOptions);

        let model = this.instance.define(name, schema, modelOptions);

        if (onDefine) {
            onDefine(model);
        }

        this.enhanceModel(model);
        model.setMetas(metas || {});

        this.models[name] = model;

        return model;
    }

    getModels() {
        return this.models;
    }

    getModel(name) {
        const model = this.models[name];
        if (!model) {
            throw new Error(
                `Model ${name} on Sequelize database ${this.name} not found\nAvailable models: ${_.keys(this.models).join(", ")}`
            );
        }

        return model;
    }

    enhanceModel(model) {
        model.metas = {};
        model.addMeta = function(path, value) {
            _.set(this.metas, path, value);
        }.bind(model);
        model.setMetas = function(metas) {
            this.metas = metas;
        }.bind(model);
        model.getMeta = function(path) {
            return _.get(this.metas, path);
        }.bind(model);
    }

    setupAssociations() {
        const models = this.getModels();

        for (let name in models) {
            if (this.definitions[name] && this.definitions[name].associations) {
                this.definitions[name].associations(this.getModel(name), models);
            }
        }
    }

    sync(alter = true) {
        return this.instance.sync(alter);
    }
}

module.exports = SequelizeDb;
