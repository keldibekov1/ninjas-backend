import {
  registerDecorator,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

function IsArrayEnum(enumClass: any) {
  @ValidatorConstraint({ name: 'IsArrayOfEnum', async: false })
  class IsArrayOfEnumImpl implements ValidatorConstraintInterface {
    validate(values: any[], args: ValidationArguments) {
      if (typeof values !== 'object') return false;

      const enumValues = Object.values(args.constraints[0]);
      return values.every((val) => enumValues.includes(val));
    }

    defaultMessage(args: ValidationArguments) {
      const enumValues = Object.values(args.constraints[0]).join(', ');
      return `${args.property} must be one of the following values: ${enumValues}`;
    }
  }

  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsArrayEnum',
      target: object.constructor,
      propertyName: propertyName,
      validator: new IsArrayOfEnumImpl(),
      constraints: [enumClass],
    });
  };
}

export default IsArrayEnum;
