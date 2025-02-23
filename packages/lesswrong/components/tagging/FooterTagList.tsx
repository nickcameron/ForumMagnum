import React, { useCallback, useState } from 'react';
import { Components, registerComponent, getFragment } from '../../lib/vulcan-lib';
import { useMulti } from '../../lib/crud/withMulti';
import { useMutation, gql } from '@apollo/client';
import { useCurrentUser } from '../common/withUser';
import { useTracking, useOnMountTracking } from "../../lib/analyticsEvents";
import { contentTypes } from '../posts/PostsPage/ContentType';
import { tagStyle, smallTagTextStyle } from './FooterTag';
import classNames from 'classnames';
import Card from '@material-ui/core/Card';
import { Link } from '../../lib/reactRouterWrapper';
import * as _ from 'underscore';
import { forumSelect } from '../../lib/forumTypeUtils';
import { filter } from 'underscore';

const styles = (theme: ThemeType): JssStyles => ({
  root: {
    marginTop: 8,
    marginBottom: 8,
  },
  frontpageOrPersonal: {
    ...tagStyle(theme),
    backgroundColor: theme.palette.tag.hollowTagBackground,
    paddingTop: 4,
    paddingBottom: 4,
    border: theme.palette.tag.coreTagBorder,
    color: theme.palette.text.dim3,
  },
  card: {
    width: 450,
    padding: 16,
    paddingTop: 8
  },
  smallText: {
    ...smallTagTextStyle(theme),
  }
});

export function sortTags<T>(list: Array<T>, toTag: (item: T)=>TagBasicInfo|null|undefined): Array<T> {
  return _.sortBy(list, item=>toTag(item)?.core);
}

const FooterTagList = ({post, classes, hideScore, hideAddTag, smallText=false, showCoreTags, hidePostTypeTag, link=true}: {
  post: PostsWithNavigation | PostsWithNavigationAndRevision | PostsList | SunshinePostsList,
  classes: ClassesType,
  hideScore?: boolean,
  hideAddTag?: boolean,
  showCoreTags?: boolean
  hidePostTypeTag?: boolean,
  smallText?: boolean,
  link?: boolean
}) => {
  const [isAwaiting, setIsAwaiting] = useState(false);
  const currentUser = useCurrentUser();
  const { captureEvent } = useTracking()
  const { LWTooltip, AddTagButton, CoreTagsChecklist } = Components

  // [Epistemic status - two years later guessing] This loads the tagrels via a
  // database query instead of using the denormalized field on posts. This
  // causes a shift of the tag in non-SSR contexts. I believe without
  // empirically testing this, that it's to allow the mutation to seamlessly
  // reorder the tags, by updating the result of this query. But you could
  // imagine that this could start with the ordering of the tags on the post
  // object, and then use the result from the database once we have it.
  const { results, loading, loadingInitial, refetch } = useMulti({
    terms: {
      view: "tagsOnPost",
      postId: post._id,
    },
    collectionName: "TagRels",
    fragmentName: "TagRelMinimumFragment", // Must match the fragment in the mutation
    limit: 100,
  });
  const tagIds = (results||[]).map((tagRel) => tagRel.tag?._id)
  useOnMountTracking({eventType: "tagList", eventProps: {tagIds}, captureOnMount: eventProps => eventProps.tagIds.length, skip: !tagIds.length||loading})

  const [mutate] = useMutation(gql`
    mutation addOrUpvoteTag($tagId: String, $postId: String) {
      addOrUpvoteTag(tagId: $tagId, postId: $postId) {
        ...TagRelMinimumFragment
      }
    }
    ${getFragment("TagRelMinimumFragment")}
  `);

  const onTagSelected = useCallback(async ({tagId, tagName}: {tagId: string, tagName: string}) => {
    setIsAwaiting(true)
    await mutate({
      variables: {
        tagId: tagId,
        postId: post._id,
      },
    });
    setIsAwaiting(false)
    refetch()
    captureEvent("tagAddedToItem", {tagId, tagName})
  }, [setIsAwaiting, mutate, refetch, post._id, captureEvent]);

  const { Loading, FooterTag, ContentStyles } = Components
  
  const MaybeLink = ({to, children}: {
    to: string|null
    children: React.ReactNode
  }) => {
    if (to) {
      return <Link to={to}>{children}</Link>
    } else {
      return <>{children}</>;
    }
  }
  
  const contentTypeInfo = forumSelect(contentTypes);
  
  const PostTypeTag = ({tooltipBody, label}) =>
    <LWTooltip
      title={<Card className={classes.card}>
        <ContentStyles contentType="comment">
          {tooltipBody}
        </ContentStyles>
      </Card>}
      tooltip={false}
    >
      <div className={classNames(classes.frontpageOrPersonal, {[classes.smallText]: smallText})}>{label}</div>
    </LWTooltip>

  // Post type is either Curated, Frontpage, Personal, or uncategorized (in which case
  // we don't show any indicator). It's uncategorized if it's not frontpaged and doesn't
  // have reviewedByUserId set to anything.
  let postType = post.curatedDate
    ? <Link to={contentTypeInfo.curated.linkTarget}>
        <PostTypeTag label="Curated" tooltipBody={contentTypeInfo.curated.tooltipBody}/>
      </Link>
    : (post.frontpageDate
      ? <MaybeLink to={contentTypeInfo.frontpage.linkTarget}>
          <PostTypeTag label="Frontpage" tooltipBody={contentTypeInfo.frontpage.tooltipBody}/>
        </MaybeLink>
      : (post.reviewedByUserId
        ? <MaybeLink to={contentTypeInfo.personal.linkTarget}>
          <PostTypeTag label="Personal Blog" tooltipBody={contentTypeInfo.personal.tooltipBody}/>
          </MaybeLink>
        : null
      )
    ) 

  if (loadingInitial || !results) {
    return <span className={classes.root}>
     {sortTags(post.tags, t=>t).map(tag => <FooterTag key={tag._id} tag={tag} hideScore smallText={smallText}/>)}
     {!hidePostTypeTag && postType}
    </span>;
  }

  
 
  return <span className={classes.root}>
    {showCoreTags && <div><CoreTagsChecklist existingTagIds={tagIds} onTagSelected={onTagSelected}/></div>}
    {sortTags(results, t=>t.tag).filter(tagRel => !!tagRel?.tag).map(tagRel =>
      tagRel.tag && <FooterTag 
        key={tagRel._id} 
        tagRel={tagRel} 
        tag={tagRel.tag} 
        hideScore={hideScore}
        smallText={smallText}
        link={link}
      />
    )}
    { !hidePostTypeTag && postType }
    {currentUser && !hideAddTag && <AddTagButton onTagSelected={onTagSelected} />}
    { isAwaiting && <Loading/>}
  </span>
};

const FooterTagListComponent = registerComponent("FooterTagList", FooterTagList, {styles});

declare global {
  interface ComponentTypes {
    FooterTagList: typeof FooterTagListComponent
  }
}
