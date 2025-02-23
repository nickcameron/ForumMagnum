import Users from "./collection";

/**Finds a user matching on email, searches case INsensitively.
 * Currently searches both email and emailS fields, though the later should ideally be full deprecated
 */
export const userFindOneByEmail = async function (email: string): Promise<DbUser | null> {
  return await Users.findOne({$or: [{email}, {['emails.address']: email}]}, {collation: {locale: 'en', strength: 2}})
};

export const usersFindAllByEmail: (email: string) => Promise<Array<DbUser | null>> = async function (email: string) {
  return await Users.find({$or: [{email}, {['emails.address']: email}]}, { collation: { locale: 'en', strength: 2 } }).fetch()
};
