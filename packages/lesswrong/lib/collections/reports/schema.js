import { foreignKeyField } from '../../utils/schemaUtils'

const schema = {
  _id: {
    type: String,
    viewableBy: ['guests'],
    optional: true,
  },
  userId: {
    ...foreignKeyField({
      idFieldName: "userId",
      resolverName: "user",
      collectionName: "Users",
      type: "User"
    }),
    viewableBy: ['guests'],
    insertableBy: ['members'],
    hidden: true,
    optional: true,
  },
  commentId: {
    ...foreignKeyField({
      idFieldName: "commentId",
      resolverName: "comment",
      collectionName: "Comments",
      type: "Comment"
    }),
    optional: true,
    viewableBy: ['guests'],
    insertableBy: ['members'],
    hidden: true,
  },
  postId: {
    ...foreignKeyField({
      idFieldName: "postId",
      resolverName: "post",
      collectionName: "Posts",
      type: "Post"
    }),
    optional: false,
    viewableBy: ['guests'],
    insertableBy: ['members'],
    hidden: true,
  },
  link: {
    type: String,
    optional: false,
    insertableBy: ['members'],
    viewableBy: ['guests'],
    hidden: true,
  },
  claimedUserId: {
    ...foreignKeyField({
      idFieldName: "claimedUserId",
      resolverName: "claimedUser",
      collectionName: "Users",
      type: "User"
    }),
    optional: true,
    viewableBy: ['guests'],
    hidden: true,
    editableBy: ['sunshineRegiment', 'admins'],
    insertableBy: ['sunshineRegiment', 'admins'],
  },
  description: {
    type: String,
    optional: true,
    viewableBy: ['guests'],
    editableBy: ['members'],
    insertableBy: ['members'],
    label: "Reason",
    placeholder: "What are you reporting this comment for?",
  },
  createdAt: {
    optional: true,
    type: Date,
    viewableBy: ['guests'],
    editableBy: ['admins'],
    onInsert: (document, currentUser) => new Date(),
  },
  closedAt: {
    optional: true,
    type: Date,
    viewableBy: ['guests'],
    editableBy: ['admins'],
  },
  // Only set when report is closed. Indicates whether content is spam or not.
  markedAsSpam: {
    optional: true,
    type: Boolean,
    viewableBy: ['guests'],
    editableBy: ['sunshineRegiment', 'admins'],
  },
  // Set when report is created, indicates whether content was reported as spam
  // (currently only used for Akismet integration)
  reportedAsSpam: {
    optional: true,
    type: Boolean,
    viewableBy: ['guests'],
    editableBy: ['sunshineRegiment', 'admins'],
    insertableBy: ['members']
  }
};

export default schema;
