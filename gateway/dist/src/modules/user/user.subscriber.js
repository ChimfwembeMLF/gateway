"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserSubscriber = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./entities/user.entity");
const bcrypt = require("bcryptjs");
let UserSubscriber = class UserSubscriber {
    listenTo() {
        return user_entity_1.User;
    }
    async beforeInsert(event) {
        if (event.entity && event.entity.password) {
            event.entity.password = await bcrypt.hash(event.entity.password, 10);
        }
    }
    async beforeUpdate(event) {
        if (event.entity && event.entity.password && event.entity.password !== event.databaseEntity.password) {
            event.entity.password = await bcrypt.hash(event.entity.password, 10);
        }
    }
};
exports.UserSubscriber = UserSubscriber;
exports.UserSubscriber = UserSubscriber = __decorate([
    (0, typeorm_1.EventSubscriber)()
], UserSubscriber);
//# sourceMappingURL=user.subscriber.js.map