"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
global.crypto = crypto;
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const swagger_setup_1 = require("./swagger/swagger.setup");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    (0, swagger_setup_1.setupSwagger)(app);
    await app.listen(process.env.PORT ?? 3000);
    console.log(`System running at http://localhost:${process.env.PORT ?? 3000}/documentation`);
}
bootstrap();
//# sourceMappingURL=main.js.map