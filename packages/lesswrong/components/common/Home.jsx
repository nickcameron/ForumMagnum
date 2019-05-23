import { Components, registerComponent, withCurrentUser} from 'meteor/vulcan:core';
import { getSetting } from 'meteor/vulcan:lib';
import React from 'react';
import { Link } from '../../lib/reactRouterWrapper.js';
import withUser from '../common/withUser';
import { withStyles } from  '@material-ui/core/styles'
import { SplitComponent } from 'meteor/vulcan:routing';
import Users from 'meteor/vulcan:users';

const styles = theme => ({
  recentDiscussionListWrapper: {
    paddingLeft: theme.spacing.unit*2,
    paddingRight: theme.spacing.unit*2,
  }
})

function getPostsSectionTitle(view, currentUser) {
  switch (view) {
    case "frontpage":
      return "Frontpage Posts";
    case "community":
      return "All Posts";
    default:
      return "Recent Posts";
  }
}

const Home = ({ currentUser, router, classes }) => {

  const currentView = _.clone(router.location.query).view || (currentUser && currentUser.currentFrontpageFilter) || "frontpage"
  let recentPostsTerms = _.isEmpty(router.location.query) ? {view: currentView, limit: 10} : _.clone(router.location.query)
  const shortformFeedId = currentUser && currentUser.shortformFeedId

  recentPostsTerms.forum = true
  if (recentPostsTerms.view === "curated" && currentUser) {
    recentPostsTerms.offset = 3
  }

  const curatedPostsTerms = {view:"curated", limit:3}
  const recentPostsTitle = getPostsSectionTitle(recentPostsTerms.view, currentUser);

  const lat = currentUser && currentUser.mongoLocation && currentUser.mongoLocation.coordinates[1]
  const lng = currentUser && currentUser.mongoLocation && currentUser.mongoLocation.coordinates[0]
  let eventsListTerms = {
    view: 'events',
    limit: 3,
  }
  if (lat && lng) {
    eventsListTerms = {
      view: 'nearbyEvents',
      lat: lat,
      lng: lng,
      limit: 3,
    }
  }

  const shouldRenderSidebar = Users.canDo(currentUser, 'posts.moderate.all') ||
      Users.canDo(currentUser, 'alignment.sidebar')

  return (
    <div>
      {shouldRenderSidebar && <SplitComponent name="SunshineSidebar" />}

      <Components.HeadTags image={getSetting('siteImage')} />
      <Components.Section title={recentPostsTitle}
        titleComponent= {<div className="recent-posts-title-component">
          <Components.HomePostsViews />
        </div>}
      >
        {/*TODO; this is an orphan that should be in ea-forum already*/}
        <Components.PostsList2 terms={recentPostsTerms} />
      </Components.Section>
      <Components.Section title="Recent Discussion" titleLink="/AllComments" titleComponent={
        <div>
          {shortformFeedId && <Components.SectionSubtitle>
            {/* TODO: set up a proper link url */}
            <Link to={`posts/${shortformFeedId}`}>Shortform Feed</Link>
          </Components.SectionSubtitle>}
        </div>
      }>
        <div className={classes.recentDiscussionListWrapper}>
          <Components.RecentDiscussionThreadsList terms={{view: 'recentDiscussionThreadsList', limit:6}}/>
        </div>
      </Components.Section>
    </div>
  )
};

registerComponent('Home', Home, withUser, withStyles(styles, {name: "Home"}));
