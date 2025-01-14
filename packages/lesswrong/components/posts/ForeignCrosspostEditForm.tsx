import React from "react";
import { Components, registerComponent, combineUrls } from "../../lib/vulcan-lib";
import {
  fmCrosspostSiteNameSetting,
  fmCrosspostBaseUrlSetting,
} from "../../lib/instanceSettings";

const styles = (theme: ThemeType): JssStyles => ({
  link: {
    color: theme.palette.primary.main,
  },
});

const ForeignCrosspostEditForm = ({post, classes}: {
  post: PostsPage,
  classes: ClassesType,
}) => {
  const {SingleColumnSection, PostsPagePostHeader, Typography} = Components;

  const url = combineUrls(fmCrosspostBaseUrlSetting.get() ?? "", `editPost?postId=${post._id}&eventForm=false`);

  const postWithNavigation: PostsWithNavigation = {
    ...post,
    tableOfContents: null,
    sequence: null,
    prevPost: null,
    nextPost: null,
  };

  return (
    <SingleColumnSection>
      <PostsPagePostHeader post={postWithNavigation} hideMenu hideTags />
      <Typography variant="body2">
        This post cannot be edited as it is a crosspost. <a href={url} className={classes.link}>Click here</a> to edit on {fmCrosspostSiteNameSetting.get()}.
      </Typography>
    </SingleColumnSection>
  );
}

const ForeignCrosspostEditFormComponent = registerComponent("ForeignCrosspostEditForm", ForeignCrosspostEditForm, {styles});

declare global {
  interface ComponentTypes {
    ForeignCrosspostEditForm: typeof ForeignCrosspostEditFormComponent
  }
}
