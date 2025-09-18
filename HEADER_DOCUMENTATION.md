# ModernHeader Component Documentation

The ModernHeader component is a flexible, modern header system designed for the Zenith app. It provides multiple variants and extensive customization options.

## Features

- ✨ **4 Beautiful Variants**: Default, Gradient, Glass (Blur), and Minimal
- 🎨 **Smooth Animations**: Slide and fade animations
- 📱 **Platform Optimized**: iOS and Android specific styling
- 🔧 **Highly Customizable**: Colors, icons, actions, and content
- 💎 **Modern Design**: Following latest mobile design principles

## Basic Usage

```javascript
import { ModernHeader, GradientHeader, GlassHeader, MinimalHeader } from '../components/UI';

// Simple header
<ModernHeader 
  title="Dashboard" 
  subtitle="Welcome back" 
/>

// Header with actions
<ModernHeader 
  title="Profile"
  leftIcon="chevron-back"
  onLeftPress={() => navigation.goBack()}
  rightIcon="settings-outline"
  onRightPress={() => navigation.navigate('Settings')}
/>
```

## Header Variants

### 1. Default Header
Standard header with solid background color.

```javascript
<ModernHeader 
  title="Dashboard"
  subtitle="Your fitness journey"
  backgroundColor={colors.primary}
  rightIcon="notifications-outline"
  onRightPress={handleNotifications}
/>
```

### 2. Gradient Header
Beautiful gradient background.

```javascript
<GradientHeader 
  title="Workout"
  subtitle="Push your limits"
  leftIcon="chevron-back"
  onLeftPress={() => navigation.goBack()}
  rightIcon="heart-outline"
  onRightPress={handleFavorite}
/>
```

### 3. Glass Header (Blur Effect)
Modern frosted glass effect with blur.

```javascript
<GlassHeader 
  title="Classes"
  subtitle="Find your perfect class"
  rightIcon="search-outline"
  onRightPress={handleSearch}
/>
```

### 4. Minimal Header
Clean, minimal design for simple screens.

```javascript
<MinimalHeader 
  title="Settings"
  showBackButton={true}
  onBackPress={() => navigation.goBack()}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | string | - | Header title text |
| `subtitle` | string | - | Header subtitle text |
| `variant` | string | 'default' | Header variant: 'default', 'minimal', 'gradient', 'glass' |
| `leftIcon` | string | - | Ionicons name for left button |
| `rightIcon` | string | - | Ionicons name for right button |
| `onLeftPress` | function | - | Left button press handler |
| `onRightPress` | function | - | Right button press handler |
| `backgroundColor` | string | colors.primary | Background color (default variant only) |
| `showBackButton` | boolean | false | Show back navigation button |
| `onBackPress` | function | - | Back button press handler |
| `headerRight` | React.Node | - | Custom right component |
| `transparent` | boolean | false | Transparent background |
| `children` | React.Node | - | Additional content below title |
| `animated` | boolean | true | Enable entrance animations |

## Advanced Examples

### Header with Custom Stats
```javascript
<GradientHeader 
  title="Dashboard"
  subtitle="Your progress today"
  rightIcon="refresh"
  onRightPress={refresh}
>
  <View style={styles.headerStats}>
    <View style={styles.statItem}>
      <Text style={styles.statValue}>12</Text>
      <Text style={styles.statLabel}>Completed</Text>
    </View>
    <View style={styles.statItem}>
      <Text style={styles.statValue}>3</Text>
      <Text style={styles.statLabel}>Upcoming</Text>
    </View>
    <View style={styles.statItem}>
      <Text style={styles.statValue}>45h</Text>
      <Text style={styles.statLabel}>Total Hours</Text>
    </View>
  </View>
</GradientHeader>
```

### Header with Custom Right Component
```javascript
<ModernHeader 
  title="Messages"
  headerRight={
    <TouchableOpacity onPress={handleCompose}>
      <View style={styles.composeButton}>
        <Ionicons name="create-outline" size={20} color={colors.white} />
        <Text style={styles.composeText}>New</Text>
      </View>
    </TouchableOpacity>
  }
/>
```

### Animated Header
```javascript
<GlassHeader 
  title="Welcome"
  subtitle="Let's start your journey"
  animated={true}
  rightIcon="help-circle-outline"
  onRightPress={showHelp}
/>
```

## Styling Guidelines

### Header Stats Style Example
```javascript
const styles = StyleSheet.create({
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  headerStatItem: {
    alignItems: 'center',
  },
  headerStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  headerStatLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
});
```

## Icon Recommendations

Popular Ionicons that work well with the header:

- **Navigation**: `chevron-back`, `close`, `arrow-back`
- **Actions**: `search-outline`, `filter-outline`, `settings-outline`
- **Social**: `heart-outline`, `share-outline`, `bookmark-outline`
- **Communication**: `notifications-outline`, `mail-outline`, `call-outline`
- **Utility**: `refresh`, `help-circle-outline`, `information-circle-outline`

## Best Practices

1. **Keep titles concise** - Maximum 2-3 words for better readability
2. **Use meaningful subtitles** - Provide context about the screen content
3. **Choose appropriate variants** - Match the header style with screen content
4. **Consistent icon usage** - Use the same icon style throughout the app
5. **Proper color contrast** - Ensure text is readable on all backgrounds
6. **Test on different devices** - Verify the header looks good on various screen sizes

## Integration with Navigation

### React Navigation Stack Headers
```javascript
// In your navigator
<Stack.Screen 
  name="Dashboard"
  component={DashboardScreen}
  options={{ headerShown: false }} // Hide default header
/>

// In your screen component
<SafeAreaView style={styles.container}>
  <GradientHeader 
    title="Dashboard"
    subtitle="Welcome back"
    showBackButton={navigation.canGoBack()}
    onBackPress={() => navigation.goBack()}
  />
  {/* Screen content */}
</SafeAreaView>
```

This header system provides a consistent, modern interface across your entire Zenith app while maintaining flexibility for different screen requirements.
