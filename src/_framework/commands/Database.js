const _ = require("lodash");

class DatabaseCommand {
    constructor(registry) {
        this.registry = registry;
        this.prefix = "sequelize:database"; 
    }

    register(program) {
        program
            .command(`${this.prefix}:sync`, `Synchronise the database with the current model`)
            .option("-d, --database [db]", "Use following database (default: 'default')")
            .option("-a, --alter", "Try to synchronize database with alter statements instead of DROP / CREATE", false)
            .option("-f, --force", "Force database synchronisation (DROP TABLE)", false)
            .option("-m, --model", "Synchronise only specified model", false)
            .action(this.sync.bind(this));

        program
            .command(`${this.prefix}:create`, `Create the database`)
            .option("-d, --database [db]", "Use following database (default: 'default')")
            .action(this.create.bind(this));

        program
            .command(`${this.prefix}:drop`, `Drop the specified database`)
            .option("-d, --database [db]", "Use following database (default: 'default')")
            .action(this.drop.bind(this));

        program.command(`${this.prefix}:list`, `List the configured databases`).action(this.list.bind(this));
    }

    async sync({ operation }, { database, force, alter, model }, logger) {
        database = database || "default";
        let target = this.registry.getDatabase(database);
        if (model) {
            target = target.getModel(model);
        }

        console.log(`Synchronise database ${database} ${model ? model : ""} with ${force ? "force" : ""}${alter ? "alter" : ""}`);

        return target.sync({ alter, force });
    }

    /**
     * @see https://github.com/sequelize/cli/blob/master/src/commands/database.js
     */
    async create() {
        throw new Error("Not implemented yet");
    }

    async drop() {
        throw new Error("Not implemented yet");
    }

    async list() {
        _.each(this.registry.getDatabases(), (db, dbName) => {
            console.log("- ", dbName);
        });
    }
}

module.exports = DatabaseCommand;
