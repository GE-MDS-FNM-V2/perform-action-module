# I want to start working on this project
This document is the place to get all the info you will need to get started

## Running the code
You will most likely want to get started with the following commands
```
yarn
yarn run test:watch
```
This will install all of your [git hooks](https://githooks.com/) and dependencies (aka - npm packages) and have tests running in [watch mode](https://jestjs.io/docs/en/cli#--watch).

## Testing the code
We use [jest](https://jestjs.io/) to test this library. Please see its documentation on how to use it

## Committing your changes
When you run `yarn` to install your dependencies, git hooks are automatically installed for you. 

When you run `git commit` you will notice it starts doing things automatically that a default git repo wouldnt do.
Those things are
- generate documentation with typedoc
- lint your code and prevent the commit if linting fails
- prompt you with an interactive tool to generate your commit message

## Why is committing so weird?
When you release packages to npm, you release them in a X.X.X format as stated in the `version` property within your package.json.

This is called semver and actually means something.
You can read more about semver [here](https://semver.org/)

Every time you want to deploy something to npm you will have to change the semantic version in your package.json. 
Its not optional, npm will actually reject the release if a version with that number is already released.

That means you have two options:
1) update the version manually every time you commit
2) setup automatic versioning

Obviously automating it will be the better solution, but at what cost? In our case its the ease of committing. You sacrafice a couple
seconds every time you commit to generate a well formed commit message that abides by the [conventional commits standard](https://www.conventionalcommits.org/en/v1.0.0/).
By analyzing commit messages, it is able to determine if needs to increase the major minor patch attributes of your version.

This gets tedious to do by hand, so a tool called [commit-zen](https://github.com/commitizen/cz-cli) helps you make the commit message.
This is the interactive cli tool you use when committing.

## Pushing your changes to a feature branch
You will most commonly push to a branch called `next` that will automatically be published to npm by a tool called semantic-release.
If you would like to learn more about that, see these links
- Semantic release has been configured to look at the "release" property within the package.json
https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md#configuration-file
https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md#options
- TODO - allow for multiple feature branches at once

## Merging changes into master
Its as simple as merging your feature branch into master. It will automatically be pushed to npm as latest.


## I want to do something else
### yarn scripts
 - `yarn start`: Run `yarn run build` in watch mode
 - `yarn run test:watch`: Run test suite in [interactive watch mode](http://facebook.github.io/jest/docs/cli.html#watch)
 - `yarn run test:prod`: Run linting and generate coverage
 - `yarn run build`: Generate bundles and typings, create docs
 - `yarn run lint`: Lints code
 - `yarn run commit`: Commit using conventional commit style ([husky](https://github.com/typicode/husky) will tell you to use it if you haven't :wink:)

