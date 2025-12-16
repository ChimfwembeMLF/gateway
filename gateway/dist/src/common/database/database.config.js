"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeOrmConfigFactory = typeOrmConfigFactory;
function typeOrmConfigFactory(configService) {
    return {
        type: 'postgres',
        host: configService.get('db.host'),
        port: configService.get('db.port'),
        username: configService.get('db.username'),
        password: configService.get('db.password'),
        database: configService.get('db.database'),
        entities: [
            process.env.NODE_ENV === 'production'
                ? 'dist/modules/**/*.entity.js'
                : 'src/modules/**/*.entity.ts',
        ],
        synchronize: true,
        migrations: [
            process.env.NODE_ENV === 'production'
                ? __dirname + '/migrations/*.js'
                : __dirname + '/migrations/*.ts',
        ],
    };
}
//# sourceMappingURL=database.config.js.map