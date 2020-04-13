import { Components, registerComponent, getSetting } from '../../../lib/vulcan-lib';
import React, { Component } from 'react';
import { withLocation } from '../../../lib/routeUtil';
import { Posts } from '../../../lib/collections/posts';
import { Comments } from '../../../lib/collections/comments'
import { postBodyStyles } from '../../../themes/stylePiping'
import withUser from '../../common/withUser';
import withErrorBoundary from '../../common/withErrorBoundary'
import classNames from 'classnames';
import withRecordPostView from '../../common/withRecordPostView';
import withNewEvents from '../../../lib/events/withNewEvents';
import { userHasPingbacks } from '../../../lib/betas';
import { AnalyticsContext } from "../../../lib/analyticsEvents";
import * as _ from 'underscore';
import { Meteor } from 'meteor/meteor';

const HIDE_POST_BOTTOM_VOTE_WORDCOUNT_LIMIT = 300
const DEFAULT_TOC_MARGIN = 100
const MAX_TOC_WIDTH = 270
const MIN_TOC_WIDTH = 200
const MAX_COLUMN_WIDTH = 720

const styles = theme => ({
  root: {
    position: "relative",
    [theme.breakpoints.down('sm')]: {
      marginTop: 12
    }
  },
  tocActivated: {
    // Check for support for template areas before applying
    '@supports (grid-template-areas: "title")': {
      display: 'grid',
      gridTemplateColumns: `
        1fr
        minmax(${MIN_TOC_WIDTH}px, ${MAX_TOC_WIDTH}px)
        minmax(0px, ${DEFAULT_TOC_MARGIN}px)
        minmax(min-content, ${MAX_COLUMN_WIDTH}px)
        minmax(0px, ${DEFAULT_TOC_MARGIN}px)
        1.5fr
      `,
      gridTemplateAreas: `
        "... ... .... title   .... ..."
        "... toc gap1 content gap2 ..."
      `,
    },
    [theme.breakpoints.down('sm')]: {
      display: 'block'
    }
  },
  title: {
    gridArea: 'title',
    marginBottom: 32,
    [theme.breakpoints.down('sm')]: {
      marginBottom: theme.spacing.titleDividerSpacing,
    }
  },
  toc: {
    '@supports (grid-template-areas: "title")': {
      gridArea: 'toc',
      position: 'unset',
      width: 'unset'
    },
    //Fallback styles in case we don't have CSS-Grid support. These don't get applied if we have a grid
    position: 'absolute',
    width: MAX_TOC_WIDTH,
    left: -DEFAULT_TOC_MARGIN,
  },
  content: { gridArea: 'content' },
  gap1: { gridArea: 'gap1'},
  gap2: { gridArea: 'gap2'},
  post: {
    maxWidth: 650 + (theme.spacing.unit*4),
    marginLeft: 'auto',
    marginRight: 'auto'
  },
  recommendations: {
    maxWidth: MAX_COLUMN_WIDTH,
    marginLeft: 'auto',
    marginRight: 'auto',
    // Hack to deal with the PostsItem action items being absolutely positioned
    paddingRight: 18,
    paddingLeft: 18,
    [theme.breakpoints.down('sm')]: {
      paddingRight: 0,
      paddingLeft: 0
    }
  },
  divider: {
    marginTop: theme.spacing.unit*2,
    marginBottom: theme.spacing.unit*2,
    marginLeft:0,
    borderTop: "solid 1px rgba(0,0,0,.1)",
    borderLeft: 'transparent'
  },
  postBody: {
    marginBottom: 50,
  },
  postContent: postBodyStyles(theme),
  subtitle: {
    ...theme.typography.subtitle,
  },
  voteBottom: {
    position: 'relative',
    fontSize: 42,
    textAlign: 'center',
    display: 'inline-block',
    marginLeft: 'auto',
    marginRight: 'auto',
    marginBottom: 40
  },
  draft: {
    color: theme.palette.secondary.light
  },
  bottomNavigation: {
    width: 640,
    margin: 'auto',
    [theme.breakpoints.down('sm')]: {
      width:'100%',
      maxWidth: MAX_COLUMN_WIDTH
    }
  },
  contentNotice: {
    ...theme.typography.contentNotice,
    ...theme.typography.postStyle
  },
  commentsSection: {
    minHeight: 'calc(70vh - 100px)',
    [theme.breakpoints.down('sm')]: {
      paddingRight: 0,
      marginLeft: 0
    },
    // TODO: This is to prevent the Table of Contents from overlapping with the comments section. Could probably fine-tune the breakpoints and spacing to avoid needing this.
    background: "white",
    position: "relative"
  },
  footerSection: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '1.4em'
  },
  bottomDate: {
    color: theme.palette.grey[600]
  },
  reviewInfo: {
    textAlign: "center",
    marginBottom: 32
  },
  reviewLabel: {
    ...theme.typography.postStyle,
    ...theme.typography.contentNotice,
    marginBottom: theme.spacing.unit,
  }
})

interface ExternalProps {
  post: PostsWithNavigation|PostsWithNavigationAndRevision,
  refetch: any,
}
interface PostsPageProps extends ExternalProps, WithUserProps, WithLocationProps, WithStylesProps {
  closeAllEvents: any,
  recordPostView: any,
}

class PostsPage extends Component<PostsPageProps> {

  getSequenceId() {
    const { post } = this.props;
    const { params } = this.props.location;
    return params.sequenceId || post?.canonicalSequenceId;
  }

  shouldHideAsSpam() {
    const { post, currentUser } = this.props;

    // Logged-out users shouldn't be able to see spam posts
    if (post.authorIsUnreviewed && !currentUser) {
      return true;
    }

    return false;
  }

  getDescription = post => {
    if (post.contents?.plaintextDescription) return post.contents.plaintextDescription
    if (post.shortform) return `A collection of shorter posts by ${getSetting('title')} user ${post.user.displayName}`
    return null
  }

  render() {
    const { post, refetch, currentUser, classes, location: { query, params } } = this.props
    const { HeadTags, PostsVote, PostsPagePostHeader,
      LinkPostMessage, PostsCommentsThread, PostsGroupDetails, BottomNavigation,
      PostsTopSequencesNav, PostsPageEventData, ContentItemBody, PostsPageQuestionContent,
      TableOfContents, PostsRevisionMessage, AlignmentCrosspostMessage, CommentPermalink,
      PingbacksList, FooterTagList, AnalyticsInViewTracker } = Components

    if (this.shouldHideAsSpam()) {
      throw new Error("Logged-out users can't see unreviewed (possibly spam) posts");
    } else {
      const { html, wordCount = 0 } = post.contents || {}
      const view = _.clone(query).view || Comments.getDefaultView(post, currentUser)
      const commentTerms = _.isEmpty(query.view) ? {view: view, limit: 500} : {...query, limit:500}
      const sequenceId = this.getSequenceId();
      const sectionData = (post as PostsWithNavigationAndRevision).tableOfContentsRevision || (post as PostsWithNavigation).tableOfContents;
      const htmlWithAnchors = (sectionData && sectionData.html) ? sectionData.html : html

      const commentId = query.commentId || params.commentId

      const description = this.getDescription(post)

      return (
          <AnalyticsContext pageContext="postsPage" postId={post._id}>
            <div className={classNames(classes.root, {[classes.tocActivated]: !!sectionData})}>
              <HeadTags url={Posts.getPageUrl(post, true)} canonicalUrl={post.canonicalSource} title={post.title} description={description}/>
              {/* Header/Title */}
              <AnalyticsContext pageSectionContext="postHeader"><div className={classes.title}>
                <div className={classes.post}>
                  {commentId && <CommentPermalink documentId={commentId} post={post}/>}
                  {post.groupId && <PostsGroupDetails post={post} documentId={post.groupId} />}
                  <AnalyticsContext pageSectionContext="topSequenceNavigation">
                    <PostsTopSequencesNav post={post} />
                  </AnalyticsContext>
                  
                  <PostsPagePostHeader post={post}/>
                  
                  <hr className={classes.divider}/>
                  {post.isEvent && <PostsPageEventData post={post}/>}
                </div>
              </div></AnalyticsContext>
              <div className={classes.toc}>
                <TableOfContents sectionData={sectionData} document={post} />
              </div>
              <div className={classes.gap1}/>
              <div className={classes.content}>
                <div className={classes.post}>
                  {/* Body */}
                  <div className={classes.postBody}>
                    { post.isEvent && <Components.SmallMapPreview post={post} /> }
                    <div className={classes.postContent}>
                      {/* disabled except during Review */}
                      {/* {(post.nominationCount2018 >= 2) && <div className={classes.reviewInfo}>
                        <div className={classes.reviewLabel}>
                          This post has been nominated for the <HoverPreviewLink href="http://lesswrong.com/posts/qXwmMkEBLL59NkvYR/the-lesswrong-2018-review-posts-need-at-least-2-nominations" innerHTML={"2018 Review"}/>
                        </div>
                        <ReviewPostButton post={post} reviewMessage="Write a Review"/>
                      </div>} */}

                      <AlignmentCrosspostMessage post={post} />
                      { post.authorIsUnreviewed && !post.draft && <div className={classes.contentNotice}>This post is awaiting moderator approval</div>}
                      <LinkPostMessage post={post} />
                      {query.revision && <PostsRevisionMessage post={post} />}
                      <AnalyticsContext pageSectionContext="postBody">
                        { html && <ContentItemBody dangerouslySetInnerHTML={{__html: htmlWithAnchors}} description={`post ${post._id}`}/> }
                      </AnalyticsContext>
                    </div>
                    <FooterTagList post={post}/>
                  </div>
                </div>

                {/* Footer */}

                {(wordCount > HIDE_POST_BOTTOM_VOTE_WORDCOUNT_LIMIT) &&
                  <div className={classes.footerSection}>
                    <div className={classes.voteBottom}>
                      <PostsVote
                        collection={Posts}
                        post={post}
                        />
                    </div>
                  </div>}
                {sequenceId && <div className={classes.bottomNavigation}>
                  <AnalyticsContext pageSectionContext="bottomSequenceNavigation">
                    <BottomNavigation post={post}/>
                  </AnalyticsContext>
                </div>}

                {userHasPingbacks(currentUser) && <div className={classes.post}>
                  <AnalyticsContext pageSectionContext="pingbacks">
                    <PingbacksList postId={post._id}/>
                  </AnalyticsContext>
                </div>}

                <AnalyticsInViewTracker eventProps={{inViewType: "commentsSection"}} >
                  {/* Answers Section */}
                  {post.question && <div className={classes.post}>
                    <div id="answers"/>
                    <AnalyticsContext pageSectionContext="answersSection">
                      <PostsPageQuestionContent post={post} refetch={refetch}/>
                    </AnalyticsContext>
                  </div>}
                  {/* Comments Section */}
                  <div className={classes.commentsSection}>
                    <AnalyticsContext pageSectionContext="commentsSection">
                      <PostsCommentsThread terms={{...commentTerms, postId: post._id}} post={post} newForm={!post.question}/>
                    </AnalyticsContext>
                  </div>
                </AnalyticsInViewTracker>
              </div>
              <div className={classes.gap2}/>
            </div>
          </AnalyticsContext>
      );
    }
  }

  async componentDidMount() {
    this.props.recordPostView({
      post: this.props.post,
      extraEventProperties: {
        sequenceId: this.getSequenceId()
      }
    });
  }

  componentDidUpdate(prevProps) {
    if (prevProps.post && this.props.post && prevProps.post._id !== this.props.post._id) {
      this.props.closeAllEvents();
      this.props.recordPostView({
        post: this.props.post,
        extraEventProperties: {
          sequenceId: this.getSequenceId(),
        }
      });
    }
  }
}

const PostsPageComponent = registerComponent<ExternalProps>(
  'PostsPage', PostsPage, {
    styles,
    hocs: [
      withUser, withLocation,
      withRecordPostView,
      withNewEvents,
      withErrorBoundary
    ]
  }
);

declare global {
  interface ComponentTypes {
    PostsPage: typeof PostsPageComponent
  }
}
