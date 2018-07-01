const _ = require("lodash");

class ModelsCommand {
    constructor(registry) {
        this.registry = registry;
    }

    register(program) {
        program
            .command("sequelize:models [operation]")
            .description(
                `Manage your sequelize configured models
        Available operations:
                list        List all models
            `
            )
            .option("-d, --database [db]", "Use following database")
            .action(this.execute.bind(this));
    }

    execute(operation, command) {
        const database = this.registry.getDatabase(command.database || "default");

        switch (operation) {
            case "list":
                console.log("Models: ");
                _.each(database.getModels(), (model, modelName) => {
                    console.log("- ", modelName);
                });
                break;
            default:
                console.log("help me bébé");
        }
    }
}

module.exports = ModelsCommand;
