import { Project } from "ts-morph";
import path from "path";

import { pascalCase } from "../helpers";
import {
  resolversFolderName,
  crudResolversFolderName,
  ModelKeys,
} from "../config";
import {
  generateTypeGraphQLImport,
  generateArgsImports,
  generateModelsImports,
  generateOutputsImports,
  generateGraphQLScalarImport,
} from "../imports";
import saveSourceFile from "../../utils/saveSourceFile";
import { GenerateCodeOptions } from "../options";
import { generateCrudResolverClassMethodDeclaration } from "./helpers";
import { DmmfDocument } from "../dmmf/dmmf-document";
import { DMMF } from "../dmmf/types";

export default async function generateActionResolverClass(
  project: Project,
  baseDirPath: string,
  model: DMMF.Model,
  operationKind: string,
  actionName: ModelKeys,
  method: DMMF.SchemaField,
  outputTypeName: string,
  argsTypeName: string | undefined,
  collectionName: string,
  modelNames: string[],
  mapping: DMMF.Mapping,
  options: GenerateCodeOptions,
  dmmfDocument: DmmfDocument,
): Promise<string> {
  const actionResolverName = `${pascalCase(
    actionName,
  )}${dmmfDocument.getModelTypeName(mapping.model)}Resolver`;
  const resolverDirPath = path.resolve(
    baseDirPath,
    resolversFolderName,
    crudResolversFolderName,
    model.typeName,
  );
  const filePath = path.resolve(resolverDirPath, `${actionResolverName}.ts`);
  const sourceFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });

  generateTypeGraphQLImport(sourceFile);
  if (argsTypeName) {
    generateArgsImports(sourceFile, [argsTypeName], 0);
  }
  generateModelsImports(
    sourceFile,
    [model.name, outputTypeName]
      .filter(name => modelNames.includes(name))
      .map(typeName =>
        dmmfDocument.isModelName(typeName)
          ? dmmfDocument.getModelTypeName(typeName)!
          : typeName,
      ),
    3,
  );
  generateOutputsImports(
    sourceFile,
    [outputTypeName]
      .filter(name => !modelNames.includes(name))
      .map(typeName =>
        typeName.includes("Aggregate")
          ? `Aggregate${dmmfDocument.getModelTypeName(
              typeName.replace("Aggregate", ""),
            )}`
          : typeName,
      ),
    2,
  );

  sourceFile.addClass({
    name: actionResolverName,
    isExported: true,
    decorators: [
      {
        name: "Resolver",
        arguments: [`_of => ${model.typeName}`],
      },
    ],
    methods: [
      generateCrudResolverClassMethodDeclaration(
        operationKind,
        actionName,
        model.typeName,
        method,
        argsTypeName,
        collectionName,
        dmmfDocument,
        mapping,
        options,
      ),
    ],
  });

  await saveSourceFile(sourceFile);
  return actionResolverName;
}
