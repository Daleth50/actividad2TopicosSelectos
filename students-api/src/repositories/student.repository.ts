import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {Student, StudentRelations} from '../models';

export class StudentRepository extends DefaultCrudRepository<
  Student,
  typeof Student.prototype.StudentId,
  StudentRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(Student, dataSource);
  }
}
