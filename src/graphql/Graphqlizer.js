const _ = require("lodash");
const { GraphType, GraphInput } = require("@lovejs/graphql/src/graphql");

class Graphqlizer {
    constructor(Sequelize, models) {
        this.Sequelize = Sequelize;
        this.types = Sequelize.DataTypes;
        this.models = models;
    }

    getModel(model) {
        if (!this.models[model]) {
            throw new Error(`Graphqlizer error : model ${model} not found in ${_.keys(this.models).join(", ")}`);
        }
        return this.models[model];
    }

    getGraphqlType(modelName, { scope, name, properties, resolvers, exclude, include } = {}) {
        let { gqlType, gqlProperties, gqlResolvers } = this.getGraphql(modelName, { scope: scope || "default", withAssociation: true });

        if (exclude) {
            gqlProperties = _.omit(gqlProperties, _.isArray(exclude) ? exclude : [exclude]);
            gqlResolvers = _.omit(gqlResolvers, _.isArray(exclude) ? exclude : [exclude]);
        }

        if (include) {
            gqlProperties = _.pick(gqlProperties, _.isArray(include) ? include : [include]);
            gqlResolvers = _.pick(gqlResolvers, _.isArray(include) ? include : [include]);
        }

        _.merge(gqlProperties, properties);
        _.merge(gqlResolvers, resolvers);

        const type = new GraphType();

        type.setName(name || gqlType);
        type.setProperties(gqlProperties);
        type.setResolvers(gqlResolvers);

        return type;
    }

    getGraphqlInput(modelName, { scope, name, properties, exclude } = {}) {
        let { gqlType, gqlProperties } = this.getGraphql(modelName, { scope: scope || "default", withAssociation: false });

        if (exclude) {
            gqlProperties = _.omit(gqlProperties, _.isArray(exclude) ? exclude : [exclude]);
        }

        _.merge(gqlProperties, properties);

        const input = new GraphInput();
        input.setName(name || `${gqlType}Input`);
        input.setProperties(gqlProperties);

        return input;
    }

    getGraphql(modelName, { scope, withAssociation } = {}) {
        const model = this.getModel(modelName);
        const graphql = model.getMeta("graphql");
        scope = scope || "default";

        if (graphql === undefined) {
            return false;
        }

        const gqlType = graphql.type || modelName;
        const properties = model.rawAttributes;
        const associations = model.associations || {};

        const gqlProperties = {};
        const gqlResolvers = {};

        for (let property in properties) {
            const fieldOptions = properties[property];
            if (fieldOptions.graphql !== undefined) {
                const graphqlOptions = this.normalizeFieldOption(fieldOptions.graphql);
                if (!scope || graphqlOptions.scopes.includes(scope.toLowerCase())) {
                    const isRequired = this.getPropertyRequired(property, graphqlOptions, fieldOptions);
                    const type = this.getPropertyType(property, graphqlOptions, fieldOptions);

                    gqlProperties[property] = `${type}${isRequired ? "!" : ""}`;
                }
            }
        }

        if (withAssociation) {
            for (let associationName in associations) {
                const association = associations[associationName];
                const associationOptions = association.options;

                if (associationOptions.graphql !== undefined) {
                    const graphqlOptions = this.normalizeAssociationOption(associationOptions.graphql);
                    const target = association.target;
                    const targetType = graphqlOptions.type || target.getMeta("graphql.type");
                    if (!targetType) {
                        throw new Error("The graphql type for association ");
                    }
                    if (targetType) {
                        const isAssociationMultiple = association.isMultiAssociation === true;
                        const associationName = isAssociationMultiple ? association.options.name.plural : association.options.name.singular;
                        const propertyName = graphqlOptions.name || associationName;
                        const getterName = `get${_.upperFirst(associationName)}`;

                        gqlProperties[propertyName] = isAssociationMultiple ? `[${targetType}]` : targetType;
                        gqlResolvers[propertyName] = this.getGetterResolver(getterName);
                    }
                }
            }
        }

        if (graphql.properties) {
            _.merge(gqlProperties, graphql.properties);
        }

        if (graphql.resolvers) {
            _.merge(gqlResolvers, graphql.resolvers);
        }

        return { gqlType, gqlProperties, gqlResolvers };
    }

    normalizeFieldOption(options) {
        if (options === true) {
            options = {};
        }
        _.defaults(options, {
            name: false,
            scopes: ["default"],
            type: false
        });

        if (_.isString(options.scopes)) {
            options.scopes = [options.scopes];
        }

        return options;
    }

    normalizeAssociationOption(options) {
        if (options === true) {
            options = {};
        }
        _.defaults(options, {
            name: false,
            scopes: ["default"],
            type: false
        });

        if (_.isString(options.scopes)) {
            options.scopes = [options.scopes];
        }

        return options;
    }

    getGetterResolver(method) {
        return async parent => await parent[method]();
    }

    getPropertyType(property, graphql, sequelize) {
        if (property == "id") {
            return "ID";
        }

        if (graphql.type) {
            return graphql.type;
        }

        return this.sequelizeToGraphql(sequelize.type);
    }

    getPropertyRequired(property, graphql, sequelize) {
        if (graphql.required === true) {
            return true;
        }

        if (sequelize.primaryKey === true) {
            return true;
        }

        if (sequelize.allowNull === false) {
            return true;
        }

        return false;
    }

    sequelizeToGraphql(sequelizeType) {
        const key = sequelizeType.key;

        switch (key) {
            case "STRING":
            case "CHAR":
            case "TEXT":
                return "String";
            case "TINYINT":
            case "SMALLINT":
            case "MEDIUMINT":
            case "INTEGER":
            case "BIGINT":
                return "Int";
            case "NUMBER":
            case "FLOAT":
            case "DECIMAL":
            case "REAL":
            case "DOUBLE":
            case "NUMERIC":
                return "Float";
            case "JSON":
            case "JSONB":
                return "JSON";
            case "BOOLEAN":
                return "Boolean";
            case "TIME":
            case "DATE":
            case "DATEONLY":
            case "NOW":
                return "DateTime";
            case "ARRAY":
                let subtype = this.sequelizeToGraphql(sequelizeType.type);
                return `[${subtype}]`;
                break;
            default:
                throw new Error(`Unable to translate sequelize type ${key} into GraphQL type`);
        }
    }
}

module.exports = Graphqlizer;
