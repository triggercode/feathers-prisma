"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errors = require("@feathersjs/errors");
const client_1 = require("@prisma/client");
function getType(v) {
    let type = '';
    const cases = {
        common: v >= 1000 && v < 2000,
        query: v >= 2000 && v < 3000,
        migration: v >= 3000 && v < 4000,
        introspection: v >= 4000 && v < 4000,
    };
    Object.keys(cases).map((key) => {
        // @ts-ignore
        if (cases[key]) {
            type = key;
        }
        return key;
    });
    return type;
}
function errorHandler(error, prismaMethod) {
    let feathersError;
    if (error instanceof errors.FeathersError) {
        feathersError = error;
    }
    else if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        const { code, meta, message, clientVersion, } = error;
        const errType = getType(Number(code.substring(1)));
        switch (errType) {
            case 'common':
                feathersError = new errors.GeneralError(message, { code, meta, clientVersion });
                break;
            case 'query':
                feathersError = new errors.BadRequest(message, { code, meta, clientVersion });
                if (code === 'P2025') {
                    // @ts-ignore
                    feathersError = new errors.NotFound((meta === null || meta === void 0 ? void 0 : meta.cause) || 'Record not found.');
                }
                break;
            case 'migration':
                feathersError = new errors.GeneralError(message, { code, meta, clientVersion });
                break;
            case 'introspection':
                feathersError = new errors.GeneralError(message, { code, meta, clientVersion });
                break;
            default:
                feathersError = new errors.BadRequest(message, { code, meta, clientVersion });
                break;
        }
    }
    else if (error instanceof client_1.Prisma.PrismaClientValidationError) {
        switch (prismaMethod) {
            case 'findUnique':
            case 'remove':
            case 'update':
            case 'delete':
                feathersError = new errors.NotFound('Record not found.');
                break;
            default:
                feathersError = new errors.GeneralError(error);
                break;
        }
    }
    else {
        feathersError = new errors.GeneralError(error);
    }
    throw feathersError;
}
exports.errorHandler = errorHandler;
